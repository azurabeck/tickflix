// src/pages/private/home/index.tsx
import { auth } from "@/service/FirebaseSettings";
import Dashboard from "./dashboard";

const Home = () => {
  const uid = auth.currentUser?.uid ?? null;
  return <Dashboard uid={uid} />;
};

export default Home;
