// src/app.tsx
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/service/FirebaseSettings";
import { ROUTES } from "@/service/Routes";
import Auth from "@/pages/public/auth";
import About from "@/pages/public/about";
import PrivateLayout from "@/pages/private/PrivateLayout";
import Home from "@/pages/private/home";
import Series from "@/pages/private/series";
import Anime from "@/pages/private/anime";
import AwardPage from "@/pages/private/awards";
import { OSCAR_CONFIG, GOLDEN_GLOBES_CONFIG, CANNES_CONFIG } from "@/pages/private/awards/awardConfigs";
import Timelines from "@/pages/private/timelines";
import Franchise from "@/pages/private/franchise";

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
  }, []);

  // Evita piscar a tela de login por uma fracao de segundo enquanto o
  // Firebase ainda esta checando se ja existe uma sessao salva.
  if (loading) return null;

  return (
    <Routes>
      <Route
        path={ROUTES.AUTH}
        element={user ? <Navigate to={ROUTES.HOME} replace /> : <Auth />}
      />
      {/* Layout persistente das páginas privadas — AppNav renderizada uma
          vez aqui (PrivateLayout), nunca dentro de cada página. Auth
          checada uma vez só, na rota-layout, não em cada página filha. */}
      <Route element={user ? <PrivateLayout /> : <Navigate to={ROUTES.AUTH} replace />}>
        <Route path={ROUTES.HOME} element={<Home />} />
        <Route path={ROUTES.SERIES} element={<Series />} />
        <Route path={ROUTES.ANIMES} element={<Anime />} />
        {/* As 3 rotas de premiação renderizam o MESMO componente genérico
            (pages/private/awards), só trocando a AwardConfig — ver
            "Mesma estrutura da Oscar, parametrizada", confirmado pela
            Rebecca. */}
        <Route path={ROUTES.OSCAR} element={<AwardPage config={OSCAR_CONFIG} />} />
        <Route path={ROUTES.GOLDEN_GLOBES} element={<AwardPage config={GOLDEN_GLOBES_CONFIG} />} />
        <Route path={ROUTES.CANNES} element={<AwardPage config={CANNES_CONFIG} />} />
        <Route path={ROUTES.TIMELINES} element={<Timelines />} />
        {/* Rota dinâmica — as 9 franquias (Marvel, DC, Mundo Mágico...)
            são uma lista de config (pages/private/franchise/franchiseConfigs.ts),
            não 9 rotas fixas repetidas. Primeira rota parametrizada do
            app (ver service/Routes.ts, ROUTES.FRANCHISES). */}
        <Route path={`${ROUTES.FRANCHISES}/:slug`} element={<Franchise />} />
      </Route>
      {/* Página pública — acessível logado ou não, sem redirect por auth. */}
      <Route path={ROUTES.ABOUT} element={<About />} />
      <Route path="*" element={<Navigate to={user ? ROUTES.HOME : ROUTES.AUTH} replace />} />
    </Routes>
  );
};

export default App;
