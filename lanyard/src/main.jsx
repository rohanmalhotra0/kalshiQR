import React from 'react';
import ReactDOM from 'react-dom/client';
import Lanyard from './Lanyard';

const root = document.getElementById('lanyard-root');
if (root) {
  ReactDOM.createRoot(root).render(React.createElement(Lanyard));
}
