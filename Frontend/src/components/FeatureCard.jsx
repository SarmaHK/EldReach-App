import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Reusable feature card for the landing page grid.
 * Props: icon, title, description, buttonText, to (route), color
 */
export default function FeatureCard({ icon: Icon, title, description, buttonText, to, color }) {
  const navigate = useNavigate();

  return (
    <div className="feature-card" style={{ '--accent': color }}>
      <div className="feature-card__icon">
        <Icon size={28} />
      </div>
      <h3 className="feature-card__title">{title}</h3>
      <p className="feature-card__desc">{description}</p>
      <button
        className="feature-card__btn"
        onClick={() => navigate(to)}
      >
        {buttonText}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
