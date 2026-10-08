import { useState } from "react";
import "./style.scss";

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
}

const Avatar = ({ name, imageUrl, size = 28 }: AvatarProps) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(imageUrl) && imageUrl !== failedUrl;
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}>
      {showImage ? <img src={imageUrl ?? undefined} alt={name} onError={() => setFailedUrl(imageUrl ?? null)} /> : initial}
    </span>
  );
};

export default Avatar;
