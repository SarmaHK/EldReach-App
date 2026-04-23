import React from 'react';
import { Wifi } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer__inner">
        <div className="footer__bottom">
          <span>&copy; {new Date().getFullYear()} EldReach. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
