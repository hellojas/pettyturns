import { HashRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import NewGame from './pages/NewGame';
import Game from './pages/Game';
import AsyncLobby from './pages/AsyncLobby';
import AsyncNewGame from './pages/AsyncNewGame';
import AsyncGame from './pages/AsyncGame';
import ClassicHome from './classic/pages/Home';
import ClassicNewGame from './classic/pages/NewGame';
import ClassicGame from './classic/pages/Game';

/**
 * Imperium (deck-building) is the primary game at /; hotseat under /game and
 * authoritative async multiplayer under /async. The classic area-control engine
 * remains playable under /classic.
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<NewGame />} />
        <Route path="/game/:gameId" element={<Game />} />
        <Route path="/async" element={<AsyncLobby />} />
        <Route path="/async/new" element={<AsyncNewGame />} />
        <Route path="/async/game/:gameId" element={<AsyncGame />} />
        <Route path="/classic" element={<ClassicHome />} />
        <Route path="/classic/new" element={<ClassicNewGame />} />
        <Route path="/classic/game/:gameId" element={<ClassicGame />} />
      </Routes>
    </HashRouter>
  );
}
