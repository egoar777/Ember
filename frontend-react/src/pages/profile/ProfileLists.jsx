import { Link } from 'react-router-dom';
import { useProfileCabinet } from '../../context/useProfileCabinet';
import { useI18n } from '../../context/useI18n';
import { resolveMoviePoster } from '../../utils/movieImages';
import { getDisplayTitleForString } from '../../titleOverrides';

export default function ProfileLists() {
  const { t } = useI18n();
  const { lists, listItemsById, handleRemoveListItem } = useProfileCabinet();

  return (
    <div className="profile-tab-panel profile-lists-panel">
      {lists.map((list) => {
        const items = listItemsById[list.id] || [];
        const nm = list.name.toLowerCase();
        const isWant =
          list.type === 'WantToWatch' ||
          nm.includes('хочу') ||
          nm.includes('watchlist') ||
          nm === t('listDefaultName').toLowerCase();
        return (
          <div key={list.id} className="glass-card profile-list-card">
            <div className="profile-list-head">
              <div>
                <strong>{list.name}</strong>
                <span className="profile-list-count">({items.length})</span>
              </div>
            </div>
            {isWant && items.length > 0 ? (
              <div className="movies-row profile-list-row">
                {items.map((it) => (
                  <div key={it.id} className="profile-list-item">
                    <Link to={`/movie/${it.movieId}`} className="movie-card">
                      <div className="movie-poster-wrap">
                        <img
                          className="movie-poster"
                          src={resolveMoviePoster({ id: it.movieId, title: it.movieTitle, posterUrl: it.posterUrl })}
                          alt={getDisplayTitleForString(it.movieTitle)}
                          loading="lazy"
                        />
                      </div>
                      <div className="movie-info-wrap">
                        <h3 className="movie-title">{getDisplayTitleForString(it.movieTitle)}</h3>
                      </div>
                    </Link>
                    <button
                      type="button"
                      className="profile-list-remove-btn"
                      onClick={() => handleRemoveListItem(list.id, it.id)}
                    >
                      {t('lists.remove')}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="profile-list-empty">{t('lists.empty')}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
