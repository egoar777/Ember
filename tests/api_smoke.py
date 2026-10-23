"""API regression checks against an isolated temporary SQLite database.

Run after `dotnet build backend/CinemaApp.sln` with Python 3.10+.
"""
import base64
import http.cookiejar
import json
import os
from pathlib import Path
import secrets
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / 'backend/CinemaApp.WebApi'
DLL = API / 'bin/Debug/net9.0/CinemaApp.WebApi.dll'


class Client:
    def __init__(self, base):
        self.base = base
        self.token = None
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(self, method, path, data=None, expected=200):
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = 'Bearer ' + self.token
        request = urllib.request.Request(self.base + '/api' + path,
                                         data=json.dumps(data).encode() if data is not None else None,
                                         headers=headers, method=method)
        try:
            response = self.opener.open(request, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            body = response.read().decode()
            assert response.status == expected, (method, path, response.status, body)
            return json.loads(body) if body else None


def run(base, database):
    guest, other, user, admin = [Client(base) for _ in range(4)]
    movies = guest.call('GET', '/movies?pageSize=5')['items']
    assert movies, 'Demo catalog is empty'
    assert guest.call('GET', '/movies?screeningLanguage=ru')['items'], 'Cyrillic language filter is empty'
    screening = guest.call('GET', f"/movies/{movies[0]['id']}/screenings")[0]
    sid = screening['id']
    layout = guest.call('GET', f'/screenings/{sid}/seats')
    seats = [seat['seatTemplateId'] for seat in layout['seats'] if seat['status'] == 'Available']
    assert len(seats) > 4
    cart = guest.call('POST', '/cart', {'screeningId': sid})
    cid = cart['bookingId']
    other.call('GET', f'/cart/{cid}', expected=403)
    other.call('POST', f'/bookings/{cid}/confirm-payment', expected=403)
    print('PASS: guests cannot access or pay each other\'s bookings', flush=True)

    forged = Client(base)
    encode = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
    forged.token = encode({'alg': 'none'}) + '.' + encode({'sub': '1', 'role': 'Admin'}) + '.'
    forged.call('POST', '/cart', {'screeningId': sid}, expected=401)
    forged.call('GET', '/admin/screenings', expected=401)
    print('PASS: unsigned JWT cannot impersonate a user or administrator', flush=True)

    guest.call('POST', f'/cart/{cid}/seats', {'seatTemplateId': seats[0]})
    other_cart = other.call('POST', '/cart', {'screeningId': sid})
    other.call('POST', f"/cart/{other_cart['bookingId']}/seats", {'seatTemplateId': seats[0]}, expected=400)
    guest.call('POST', '/bookings', {'screeningId': sid, 'seatTemplateIds': [], 'foodItems': None}, expected=400)
    guest.call('POST', '/bookings', {'screeningId': sid, 'seatTemplateIds': [seats[1], seats[1]], 'foodItems': None}, expected=400)
    food = guest.call('GET', '/food')[0]
    guest.call('POST', f'/cart/{cid}/food', {'foodItemId': food['id'], 'quantity': -1}, expected=400)
    print('PASS: occupied seats, empty bookings, duplicate seats and negative food quantities are rejected', flush=True)

    paid = guest.call('POST', f'/cart/{cid}/pay')['cart']
    assert paid['total'] > 0
    guest.call('POST', f'/cart/{cid}/pay', expected=400)
    assert guest.call('GET', f'/screenings/{sid}/seats')['seats']
    print('PASS: guest checkout works and cannot be paid twice', flush=True)

    registration = user.call('POST', '/auth/register', {
        'email': 'User@Example.com', 'password': 'TestPassword123!', 'displayName': 'Test User'
    })
    assert registration['user']['email'] == 'user@example.com'
    user.token = registration['token']
    user.call('GET', '/profile')
    user.call('GET', '/admin/screenings', expected=403)
    user.call('POST', f"/movies/{movies[0]['id']}/ratings", {'score': 11}, expected=400)
    user.call('POST', f"/movies/{movies[0]['id']}/ratings", {'score': 8})
    with sqlite3.connect(database) as connection:
        count, average = connection.execute('SELECT COUNT(*), AVG(Score) FROM Ratings WHERE MovieId=?', (movies[0]['id'],)).fetchone()
        stored = connection.execute('SELECT RatingCount, AverageRating FROM Movies WHERE Id=?', (movies[0]['id'],)).fetchone()
        assert stored[0] == count and abs(stored[1] - average) < 0.0001
        hashed = connection.execute('SELECT PasswordHash FROM Users WHERE Id=?', (registration['user']['id'],)).fetchone()[0]
        assert hashed.startswith('pbkdf2$')
    print('PASS: registration, permissions, salted password storage and rating aggregates', flush=True)

    expired = user.call('POST', '/cart', {'screeningId': sid})['bookingId']
    user.call('POST', f'/cart/{expired}/seats', {'seatTemplateId': seats[2]})
    with sqlite3.connect(database) as connection:
        connection.execute("UPDATE ScreeningSeatStatuses SET LockedUntil='2000-01-01 00:00:00' WHERE BookingId=?", (expired,))
    user.call('POST', f'/cart/{expired}/pay', expected=400)
    user.call('POST', f'/cart/{expired}/extend-hold', expected=400)
    print('PASS: expired holds cannot be paid or revived', flush=True)

    user_cart = user.call('POST', '/cart', {'screeningId': sid})['bookingId']
    user.call('POST', f'/cart/{user_cart}/seats', {'seatTemplateId': seats[3]})
    user.call('POST', f'/cart/{user_cart}/pay')
    before = user.call('GET', '/profile')
    user.call('POST', f'/cart/{user_cart}/pay', expected=400)
    after = user.call('GET', '/profile')
    assert before['ticketsPurchased'] == after['ticketsPurchased'] == 1
    assert before['bonusBalance'] == after['bonusBalance']
    print('PASS: duplicate checkout does not issue extra tickets or bonuses', flush=True)

    admin.token = admin.call('POST', '/auth/login', {'email': 'admin@example.com', 'password': 'AdminPassword123!'})['token']
    admin.call('GET', '/admin/screenings')
    cancelled = user.call('POST', '/cart', {'screeningId': sid})['bookingId']
    admin.call('POST', f'/admin/screenings/{sid}/cancel')
    user.call('POST', f'/cart/{cancelled}/seats', {'seatTemplateId': seats[4]}, expected=400)
    user.call('POST', '/cart', {'screeningId': sid}, expected=400)
    print('PASS: cancelled screenings reject new carts and cart changes', flush=True)
    user.call('POST', '/auth/logout', {})
    print('PASS: logout accepts an empty success response', flush=True)


def main():
    if not DLL.is_file():
        raise SystemExit('Build the backend first: dotnet build backend/CinemaApp.sln')
    with tempfile.TemporaryDirectory(prefix='ember-api-test-') as folder:
        database = str(Path(folder) / 'test.db')
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        base = f'http://127.0.0.1:{port}'
        env = {**os.environ, 'ASPNETCORE_URLS': base, 'ASPNETCORE_ENVIRONMENT': 'Development',
               'Jwt__Key': secrets.token_urlsafe(48), 'ConnectionStrings__DefaultConnection': 'Data Source=' + database,
               'Mooon__Enabled': 'false', 'Mooon__SyncOnStartup': 'false',
               'Seed__AdminEmail': 'admin@example.com', 'Seed__AdminPassword': 'AdminPassword123!'}
        with open(Path(folder) / 'server.log', 'w+') as log:
            process = subprocess.Popen(['dotnet', str(DLL)], cwd=API, env=env, stdout=log, stderr=log)
            try:
                for _ in range(120):
                    if process.poll() is not None:
                        raise RuntimeError('API process exited during startup')
                    try:
                        urllib.request.urlopen(base + '/api/news', timeout=1).close()
                        break
                    except (OSError, urllib.error.URLError):
                        time.sleep(0.25)
                else:
                    raise RuntimeError('API did not start within 30 seconds')
                run(base, database)
            except Exception:
                log.seek(0)
                print(log.read()[-6000:])
                raise
            finally:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()


if __name__ == '__main__':
    main()
