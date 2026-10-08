import { Loader2 } from "lucide-react";
import "./style.scss";

const Spinner = ({ size = 16 }: { size?: number }) => <Loader2 className="spinner" size={size} />;

export default Spinner;
