// src/components/avatar/index.tsx
// Círculo do usuário — mesma peça do UserMenu (@/components/userMenu) e
// da página de Perfil, extraída à parte porque as duas precisam dela.
// Mostra a foto (Google login) ou, sem foto (cadastro por e-mail/senha,
// ou link quebrado), a inicial do nome. Mesmo padrão já visto no projeto
// "mailbook" (livro-app) que a Rebecca pediu pra replicar aqui.
import { useState } from "react";
import "./styles.scss";

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
}

const Avatar = ({ name, imageUrl, size = 28 }: AvatarProps) => {
  // Guarda qual link falhou (não um boolean cru) pra tentar de novo
  // sozinho se o `imageUrl` mudar pra um link diferente.
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
