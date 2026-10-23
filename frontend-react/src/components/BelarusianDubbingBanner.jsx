export default function BelarusianDubbingBanner() {
  return (
    <section className="belarusian-dubbing-banner" aria-label="Беларускамоўны дубляж у Ember">
      <div className="belarusian-dubbing-banner__glow" aria-hidden="true">
        <div className="belarusian-dubbing-banner__glow-core" />
        <p className="belarusian-dubbing-banner__wordmark">
          ember<span className="belarusian-dubbing-banner__wordmark-dot">.</span>
        </p>
      </div>
      <div className="belarusian-dubbing-banner__content">
        <h2 className="belarusian-dubbing-banner__title">
          У нашым кіна ёсць паказ фільмаў на беларускай мове
        </h2>
        <p className="belarusian-dubbing-banner__text">
          З дапамогай каманды беларускамоўных актораў дубляжу
        </p>
      </div>
    </section>
  );
}
