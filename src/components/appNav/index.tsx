// src/components/appNav/index.tsx
// Nav de verdade GLOBAL — layout persistente compartilhado por todas as
// páginas privadas (Filmes, Séries, Animes, Oscar/Globo de Ouro/Cannes,
// Franquias, Timelines), renderizado uma vez por PrivateLayout, nunca
// dentro de uma página específica. Antes cada página tinha sua própria
// nav (ou pior, a nav sumia quando um dialog abria por cima — bug já
// corrigido) — isso é o resultado de separar de vez "componente global"
// de "página", pedido explícito da Rebecca. Destaque da aba ativa usa a
// ROTA de verdade (`NavLink`), não estado local.
//
// TRÊS dropdowns hoje, todos usando o mesmo `NavDropdown` genérico
// abaixo (extraído quando o segundo/terceiro dropdown entraram — antes
// só existia "Timelines", com sua própria árvore de JSX; replicar aquilo
// 3x seria a mesma lógica de abrir/fechar/clicar fora copiada 3 vezes):
// - "Timelines" — pedido explícito da Rebecca: "na nav em timeline, vai
//   virar um menu com dropdown... filmes/séries/animes". Cada item navega
//   pra `/timelines?category=X` (MESMA página, filtrada por query param
//   — ver pages/private/timelines/index.tsx). 4º item "Franquias"
//   (`?category=franquias`) entrou depois, pedido explícito da Rebecca ao
//   ver a 1ª timeline de franquia (mais de 1 tipo) na lista: "essas
//   timelines que misturam series e filmes... não deve cair na categoria
//   outros.. vamos criar a categoria no menu timeline" — junta timeline
//   com `types.length > 1`, nunca aparece nas outras 3 abas. 5º item
//   "Premiações" (`?category=premiacoes`), mesmo pedido: "pode ter a
//   categoria premiações tb ali... que vai recever as timelines do
//   oscar, globo de ouro e vestival de canes" — junta timeline com
//   `awardSlug` setado.
// - "Oscar" — pedido explícito da Rebecca: "agora na nav o menu oscar tb
//   vai virar um dropdown: Oscar, Globo de Ouro, Vestival de Canes
//   [Festival de Cannes]". Cada item é uma ROTA de verdade separada (não
//   query param — são 3 páginas/coleções Firestore diferentes, ver
//   pages/private/awards).
// - "Franquias" — pedido explícito da Rebecca, 9 franquias (Marvel, DC,
//   Mundo Mágico, Terra Média, Star Wars, Jornada nas Estrelas, Jurassic
//   Park, Percy Jackson, James Bond). Cada item é `/franquias/{slug}`
//   (rota dinâmica, ver pages/private/franchise/franchiseConfigs.ts).
//
// MOBILE (≤900px, pedido explícito da Rebecca: "faça toda a parte
// responsiva para mobile do site... não esqueça no menu na navbar") —
// 3 links + 3 dropdowns (com até 9 itens cada) + Sair NUNCA cabem numa
// linha só abaixo de ~900px, então viram um menu hambúrguer
// (`mobileMenuOpen`): a MESMA `.app-nav__tabs` (mesmos links, mesmos 3
// `NavDropdown`, mesmo estado/lógica de abrir-fechar de cada um) só
// muda de LAYOUT via CSS (`styles.scss`, `@media (max-width: 900px)`) —
// de linha horizontal pra painel vertical abaixo da navbar, com cada
// dropdown virando uma lista indentada INLINE (não mais flutuante por
// cima do conteúdo) quando aberto. Não duplica lógica nenhuma: é o
// mesmo componente, reflow por CSS.
//
// Ícone de busca — pedido explícito da Rebecca: "essa barra de search
// que a gente tem no final das páginas filmes/séries/animes pode sair
// dali e virar só um ícone de lupa no navbar, quando o usuário clica,
// então aparece o modal pra ele fazer a busca". Fica em
// `.app-nav__actions`, JUNTO do hambúrguer (não dentro de `.app-nav__menu`
// — teria que abrir o menu inteiro só pra buscar) — sempre visível,
// desktop ou mobile, um toque só de distância. Abre
// `@/components/searchModal`, o MESMO modal em qualquer página (o modal
// em si é global, não pertence a nenhuma tela específica).
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, Search, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import Logo from "@/components/logo";
import SearchModal from "@/components/searchModal";
import { ROUTES } from "@/service/Routes";
import type { TimelineCategoryFilter } from "@/service/TimelineSettings";
import { AWARD_CONFIGS } from "@/pages/private/awards/awardConfigs";
import { FRANCHISE_CONFIGS } from "@/pages/private/franchise/franchiseConfigs";
import { handleLogout } from "./functions";
import "./styles.scss";

// ROUTES.HOME continua sendo a mesma página (Dashboard) — só o RÓTULO da
// aba virou "Filmes" (pedido explícito da Rebecca: "home vai ser outra
// coisa [no futuro]... por enquanto só mudar home para filmes"). Quando
// "Home" virar uma tela própria de verdade, aí sim entra uma rota nova.
const NAV_LINKS = [
  { to: ROUTES.HOME, label: "Filmes" },
  { to: ROUTES.SERIES, label: "Séries" },
  { to: ROUTES.ANIMES, label: "Animes" },
];

interface DropdownItem {
  key: string;
  to: string;
  label: string;
  isActive: boolean;
}

const TIMELINE_CATEGORIES: { category: TimelineCategoryFilter; label: string }[] = [
  { category: "filmes", label: "Filmes" },
  { category: "series", label: "Séries" },
  { category: "animes", label: "Animes" },
  { category: "franquias", label: "Franquias" },
  { category: "premiacoes", label: "Premiações" },
];

const AppNav = () => {
  const location = useLocation();
  // Um dropdown aberto por vez — guarda a KEY do dropdown ("timelines" |
  // "oscar" | "franquias"), não um boolean por dropdown, senão abrir um
  // não fecharia os outros dois sozinho.
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  // Painel do hambúrguer (mobile, ≤900px) — some/aparece por CSS, esse
  // boolean só controla SE ele existe no DOM (evita ficar montado,
  // escondido por `display:none`, respondendo a clique-fora à toa).
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora — dropdown simples, sem lib própria pra menu.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fecha ao navegar — trocar de categoria/página não deve deixar o menu
  // (nem o painel do hambúrguer no mobile) aberto por cima da tela nova.
  useEffect(() => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  const activeCategory = new URLSearchParams(location.search).get("category");

  const timelineItems: DropdownItem[] = TIMELINE_CATEGORIES.map((item) => ({
    key: item.category,
    to: `${ROUTES.TIMELINES}?category=${item.category}`,
    label: item.label,
    isActive: location.pathname === ROUTES.TIMELINES && activeCategory === item.category,
  }));

  const awardItems: DropdownItem[] = AWARD_CONFIGS.map((config) => {
    const to = config.slug === "oscar" ? ROUTES.OSCAR : config.slug === "globo-de-ouro" ? ROUTES.GOLDEN_GLOBES : ROUTES.CANNES;
    return { key: config.slug, to, label: config.name, isActive: location.pathname === to };
  });

  const franchiseItems: DropdownItem[] = FRANCHISE_CONFIGS.map((config) => {
    const to = `${ROUTES.FRANCHISES}/${config.slug}`;
    return { key: config.slug, to, label: config.name, isActive: location.pathname === to };
  });

  const isTimelinesActive = timelineItems.some((item) => item.isActive) || location.pathname === ROUTES.TIMELINES;
  const isAwardsActive = awardItems.some((item) => item.isActive);
  const isFranchiseActive = franchiseItems.some((item) => item.isActive);

  return (
    <nav className="app-nav">
      <div className="app-nav__inner" ref={navRef}>
        <Logo />

        <div className={mobileMenuOpen ? "app-nav__menu app-nav__menu--open" : "app-nav__menu"}>
          <div className="app-nav__tabs">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                className={({ isActive }) => (isActive ? "app-nav__tab app-nav__tab--active" : "app-nav__tab")}
              >
                {link.label}
              </NavLink>
            ))}

            <NavDropdown
              id="oscar"
              label="Oscar"
              items={awardItems}
              isActive={isAwardsActive}
              isOpen={openDropdown === "oscar"}
              onToggle={() => setOpenDropdown((prev) => (prev === "oscar" ? null : "oscar"))}
            />

            <NavDropdown
              id="franquias"
              label="Franquias"
              items={franchiseItems}
              isActive={isFranchiseActive}
              isOpen={openDropdown === "franquias"}
              onToggle={() => setOpenDropdown((prev) => (prev === "franquias" ? null : "franquias"))}
            />

            <NavDropdown
              id="timelines"
              label="Timelines"
              items={timelineItems}
              isActive={isTimelinesActive}
              isOpen={openDropdown === "timelines"}
              onToggle={() => setOpenDropdown((prev) => (prev === "timelines" ? null : "timelines"))}
            />
          </div>
          <button type="button" className="app-nav__logout" onClick={handleLogout}>
            <LogOut size={16} />
            Sair
          </button>
        </div>

        {/* Busca + hambúrguer, agrupados — SEMPRE visíveis (desktop ou
            mobile), fora de `.app-nav__menu` de propósito: abrir o menu
            inteiro só pra buscar seria um passo extra à toa. */}
        <div className="app-nav__actions">
          <button type="button" className="app-nav__search-btn" onClick={() => setSearchOpen(true)} aria-label="Buscar">
            <Search size={20} />
          </button>

          {/* Hambúrguer — só existe visualmente ≤900px (CSS), mas fica no
              DOM sempre; o botão em si nunca precisa sumir de verdade,
              só o painel que ele abre. */}
          <button
            type="button"
            className="app-nav__burger"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </nav>
  );
};

// Dropdown genérico — usado pelos 3 (Oscar/Franquias/Timelines). Aberto/
// fechado é controlado de fora (`isOpen`/`onToggle`) pra garantir só UM
// aberto por vez (ver `openDropdown` acima).
interface NavDropdownProps {
  id: string;
  label: string;
  items: DropdownItem[];
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

const NavDropdown = ({ label, items, isActive, isOpen, onToggle }: NavDropdownProps) => (
  <div className="app-nav__dropdown">
    <button
      type="button"
      className={isActive ? "app-nav__tab app-nav__dropdown-trigger app-nav__tab--active" : "app-nav__tab app-nav__dropdown-trigger"}
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-haspopup="menu"
    >
      {label}
      <ChevronDown size={14} className={isOpen ? "app-nav__dropdown-chevron app-nav__dropdown-chevron--open" : "app-nav__dropdown-chevron"} />
    </button>

    {isOpen && (
      <div className="app-nav__dropdown-menu" role="menu">
        {items.map((item) => (
          <Link
            key={item.key}
            to={item.to}
            className={item.isActive ? "app-nav__dropdown-item app-nav__dropdown-item--active" : "app-nav__dropdown-item"}
            role="menuitem"
          >
            {item.label}
          </Link>
        ))}
      </div>
    )}
  </div>
);

export default AppNav;
