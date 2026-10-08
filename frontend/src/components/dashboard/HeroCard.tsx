import React from 'react';
import { t } from '../../i18n/translate';
import './HeroCard.css';

export const HeroCard: React.FC = () => {
  const currentHour = new Date().getHours();
  let greeting = `👋 ${t('Good morning')}`;

  if (currentHour >= 12 && currentHour < 17) {
    greeting = `☀️ ${t('Good afternoon')}`;
  } else if (currentHour >= 17) {
    greeting = `🌙 ${t('Good evening')}`;
  }

  return (
    <div className="hero-card">
      <div className="hero-card-bg-gradient" />
      
      <div className="hero-card-content">
        <h1 className="hero-greeting">{greeting}</h1>
        <p className="hero-tagline">{t('Your personal workspace & command center')}</p>
      </div>
    </div>
  );
};
