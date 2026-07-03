import { HashRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import NewGame from './pages/NewGame';
import Game from './pages/Game';

/**
 * HashRouter keeps saved-game URLs working from any static file host (no
 * server-side routing needed); swap for BrowserRouter when a backend arrives.
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<NewGame />} />
        <Route path="/game/:gameId" element={<Game />} />
      </Routes>
    </HashRouter>
  );
}
