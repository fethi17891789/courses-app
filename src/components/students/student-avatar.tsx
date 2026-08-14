import { getAvatarConfig, type AvatarConfig } from "@/lib/student-avatar";

/**
 * Avatar d'eleve, dessine en SVG.
 *
 * Le personnage est tire de l'identifiant de l'eleve (voir lib/student-avatar).
 *
 * ANIMATION : seuls les YEUX bougent -- un clignement bref, et de temps en
 * temps un regard qui part a gauche puis a droite. Les illustrations sont trop
 * epurees pour supporter davantage : deformer la bouche ou le visage les
 * rendait inquietants. Les regles sont dans globals.css, prefixees `.av-`.
 *
 * PERF : tout passe par `transform`, propriete que le navigateur confie a la
 * carte graphique. Aucun recalcul de mise en page, aucun JavaScript par image.
 * Tout se fige si l'utilisateur a demande a reduire les animations.
 */

const CREAM = "#F9E2DC";
const CHEEK = "#F2B4C0";
const EYE = "#141414";
const NOSE = "#F0873A";
const MOUTH = "#C42A63";
const PINK = "#F061A8";
const PINK_DEEP = "#D6357F";
const PINK_PALE = "#F7D07A";

/** Silhouette du visage : large en bas, pointe douce sur le haut du crane. */
const FACE_PATH =
  "M1 101 L1 68 C1 54 14 47 26 41 C37 35 44 26 50 13 C56 26 63 35 74 41 C86 47 99 54 99 68 L99 101 Z";

/** Coiffures longues : elles passent DERRIERE le visage, qui reste net. */
function HairBack({ config }: { config: AvatarConfig }) {
  const { palette: p, hairStyle } = config;

  if (hairStyle === "wavy") {
    return (
      <g fill="none" strokeLinecap="round">
        <path d="M12-4 C4 22 20 40 8 66 C2 82 8 96 6 106" stroke={p.hairLight} strokeWidth="18" />
        <path d="M88-4 C96 22 80 40 92 66 C98 82 92 96 94 106" stroke={p.hairLight} strokeWidth="18" />
        <path d="M26-4 C18 18 30 34 22 58 C16 76 22 92 20 106" stroke={p.hairDark} strokeWidth="12" />
        <path d="M74-4 C82 18 70 34 78 58 C84 76 78 92 80 106" stroke={p.hairDark} strokeWidth="12" />
      </g>
    );
  }

  if (hairStyle === "long") {
    return (
      <g fill="none" strokeLinecap="round">
        <path d="M14-4 C4 24 14 46 6 74 C2 90 6 100 5 106" stroke={p.hairDark} strokeWidth="22" />
        <path d="M86-4 C96 24 86 46 94 74 C98 90 94 100 95 106" stroke={p.hairDark} strokeWidth="22" />
        <path d="M30-4 C22 20 32 40 26 66" stroke={p.hairLight} strokeWidth="10" />
        <path d="M70-4 C78 20 68 40 74 66" stroke={p.hairLight} strokeWidth="10" />
      </g>
    );
  }

  return null;
}

/** Coiffures courtes : elles passent DEVANT le haut du visage. */
function HairFront({ config }: { config: AvatarConfig }) {
  const { palette: p, hairStyle } = config;

  if (hairStyle === "short") {
    return (
      <>
        <path
          d="M-2-2 H102 V33 C92 29 88 39 78 35 C68 31 64 41 54 35 C44 29 40 39 30 35 C20 31 12 39 -2 33 Z"
          fill={p.hair}
        />
        <g stroke={p.hairDark} strokeWidth="2.8" fill="none" strokeLinecap="round">
          <path d="M14 20 C24 12 38 10 48 14" />
          <path d="M56 10 C68 12 78 17 86 25" />
        </g>
      </>
    );
  }

  if (hairStyle === "bob") {
    return (
      <>
        <path
          d="M-2-2 H102 V62 C95 57 91 50 89 39 C85 29 70 23 50 23 C30 23 15 29 11 39 C9 50 5 57 -2 62 Z"
          fill={p.hair}
        />
        <path
          d="M14 33 C23 24 36 20 49 20"
          stroke={p.hairLight}
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  }

  return null;
}

function AccessoryMark({ config }: { config: AvatarConfig }) {
  const a = config.accessory;
  if (a === "none") return null;

  if (a === "flower") {
    return (
      <g transform="translate(20 30)">
        {[0, 72, 144, 216, 288].map((deg) => (
          <ellipse key={deg} cx="0" cy="-8" rx="6" ry="8" fill={PINK} transform={`rotate(${deg})`} />
        ))}
        <circle r="4.5" fill={PINK_PALE} />
      </g>
    );
  }

  if (a === "bow") {
    return (
      <g transform="translate(76 28)">
        <path d="M0 0 L-14-8 L-14 8 Z" fill={PINK} />
        <path d="M0 0 L14-8 L14 8 Z" fill={PINK} />
        <circle r="4.5" fill={PINK_DEEP} />
      </g>
    );
  }

  if (a === "heart") {
    return (
      <path
        d="M76 32 C76 26.5 83 26.5 83 32 C83 26.5 90 26.5 90 32 C90 38.5 83 43 83 43 C83 43 76 38.5 76 32 Z"
        fill={PINK}
      />
    );
  }

  if (a === "star") {
    return (
      <path
        d="M80 24 L83.5 31.5 L91 32.5 L85.5 38 L87 45.5 L80 42 L73 45.5 L74.5 38 L69 32.5 L76.5 31.5 Z"
        fill={PINK}
      />
    );
  }

  // "clips" : deux barrettes obliques
  return (
    <g stroke={PINK} strokeWidth="4.5" strokeLinecap="round">
      <path d="M74 24 L86 32" />
      <path d="M71 32 L83 40" />
    </g>
  );
}

/** Traits du visage : nez et bouche fixes, yeux animes. */
function Face() {
  return (
    <>
      {/* Chaque oeil a deux couches : la boite porte le regard qui se deplace,
          le disque porte le clignement. Les deux transformations se cumulent
          par imbrication, donc le personnage peut cligner en regardant de cote. */}
      <g className="av-eye-look">
        <circle className="av-eye" cx="41" cy="63" r="4.8" fill={EYE} />
      </g>
      <g className="av-eye-look">
        <circle className="av-eye" cx="59" cy="63" r="4.8" fill={EYE} />
      </g>

      <circle cx="50" cy="70" r="3.4" fill={NOSE} />

      <path
        d="M34 76 Q50 91 66 76"
        stroke={MOUTH}
        strokeWidth="4.6"
        fill="none"
        strokeLinecap="round"
      />
    </>
  );
}

export function StudentAvatar({
  seed,
  size = 40,
  className = "",
}: {
  /** Identifiant de l'eleve : garantit le meme personnage a chaque affichage. */
  seed: string;
  size?: number;
  className?: string;
}) {
  const config = getAvatarConfig(seed);
  const safe = seed.replace(/[^a-zA-Z0-9]/g, "");
  const frameId = `avf-${safe}`;
  const faceId = `avc-${safe}`;

  // Sur les coiffures courtes, le fond prend la couleur des cheveux : la masse
  // se fond dans la vignette, comme sur les references.
  const isShort = config.hairStyle === "short" || config.hairStyle === "bob";
  const bg = isShort ? config.palette.hair : config.palette.bg;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ ["--av-delay" as string]: `-${config.delay}s` }}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={frameId}>
          <rect width="100" height="100" rx="26" />
        </clipPath>
        {/* Les traits du visage ne peuvent pas deborder de la silhouette. */}
        <clipPath id={faceId}>
          <path d={FACE_PATH} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${frameId})`}>
        <rect width="100" height="100" fill={bg} />
        <HairBack config={config} />
        <path d={FACE_PATH} fill={CREAM} />

        <g clipPath={`url(#${faceId})`}>
          <ellipse cx="22" cy="77" rx="17" ry="15" fill={CHEEK} />
          <ellipse cx="78" cy="77" rx="17" ry="15" fill={CHEEK} />
        </g>

        <HairFront config={config} />
        <AccessoryMark config={config} />

        <Face />
      </g>
    </svg>
  );
}
