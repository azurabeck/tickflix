import { Outlet } from "react-router-dom";
import AppNav from "@/components/organisms/AppNav";
import { ConfirmProvider } from "@/contexts/Confirm";
import MediaCardsProvider from "@/contexts/MediaCards";

const PrivateLayout = () => (
  <div className="private-layout">
    <ConfirmProvider>
      <MediaCardsProvider>
        <AppNav />
        <Outlet />
      </MediaCardsProvider>
    </ConfirmProvider>
  </div>
);

export default PrivateLayout;

