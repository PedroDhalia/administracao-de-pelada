import { ChevronRight } from 'lucide-react';
import './Home.css';

// Bloco padrão da Home: título + ação opcional à direita + conteúdo.
const HomeSection = ({ icon, title, subtitle, action, children, className = '' }) => (
  <section className={`home-section animated ${className}`}>
    <div className="home-section-head">
      <div className="home-section-heading">
        <h2 className="home-section-title">
          {icon && <span className="home-section-icon">{icon}</span>}
          {title}
        </h2>
        {subtitle && <span className="home-section-subtitle">{subtitle}</span>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

export const HomeLinkButton = ({ children, onClick }) => (
  <button type="button" className="home-link-btn" onClick={onClick}>
    {children}
    <ChevronRight size={14} />
  </button>
);

export default HomeSection;
