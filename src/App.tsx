import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/service/FirebaseSettings";
import { ROUTES } from "@/routes";
import Auth from "@/pages/public/auth";
import About from "@/pages/public/about";
import PrivateLayout from "@/pages/private/PrivateLayout";
import Home from "@/pages/private/home";
import Series from "@/pages/private/series";
import Anime from "@/pages/private/anime";
import AwardPage from "@/pages/private/awards";
import { OSCAR_CONFIG, GOLDEN_GLOBES_CONFIG, CANNES_CONFIG } from "@/actions/awards/editions";
import Timelines from "@/pages/private/timelines";
import Franchise from "@/pages/private/franchise";
import Profile from "@/pages/private/profile";
import Settings from "@/pages/private/settings";

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
  }, []);

  // Espera o Firebase restaurar a sessão pra não piscar a tela de login.
  if (loading) return null;

  return (
    <Routes>
      <Route
        path={ROUTES.AUTH}
        element={user ? <Navigate to={ROUTES.HOME} replace /> : <Auth />}
      />
      {/* Rota-layout: checa o login uma vez e mantém a nav montada entre as páginas. */}
      <Route element={user ? <PrivateLayout /> : <Navigate to={ROUTES.AUTH} replace />}>
        <Route path={ROUTES.HOME} element={<Home />} />
        <Route path={ROUTES.SERIES} element={<Series />} />
        <Route path={ROUTES.ANIMES} element={<Anime />} />
        {/* As três premiações usam o mesmo componente, só muda a configuração. */}
        <Route path={ROUTES.OSCAR} element={<AwardPage config={OSCAR_CONFIG} />} />
        <Route path={ROUTES.GOLDEN_GLOBES} element={<AwardPage config={GOLDEN_GLOBES_CONFIG} />} />
        <Route path={ROUTES.CANNES} element={<AwardPage config={CANNES_CONFIG} />} />
        <Route path={ROUTES.TIMELINES} element={<Timelines />} />
        <Route path={`${ROUTES.FRANCHISES}/:slug`} element={<Franchise />} />
        <Route path={ROUTES.PROFILE} element={<Profile />} />
        <Route path={ROUTES.SETTINGS} element={<Settings />} />
      </Route>
      <Route path={ROUTES.ABOUT} element={<About />} />
      <Route path="*" element={<Navigate to={user ? ROUTES.HOME : ROUTES.AUTH} replace />} />
    </Routes>
  );
};

export default App;
