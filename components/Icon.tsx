import type { SVGProps } from "react";

// Small inline icon set (24px grid, 1.75 stroke). Replaces emoji so every icon
// matches the interface and inherits the surrounding text colour, with no extra
// icon library in the bundle.
const PATHS = {
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="M6 6l12 12M18 6L6 18" />,
    home: <path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10" />,
    plus: <path d="M12 5v14M5 12h14" />,
    select: (
        <>
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <path d="M8.5 12.5l2.5 2.5 4.5-5" />
        </>
    ),
    star: (
        <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z" />
    ),
    list: (
        <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    ),
    bag: (
        <>
            <path d="M5.5 8h13l1 12h-15z" />
            <path d="M9 8V7a3 3 0 0 1 6 0v1" />
        </>
    ),
    file: (
        <>
            <path d="M7 3h7l5 5v13H7z" />
            <path d="M14 3v5h5M10 13h6M10 17h4" />
        </>
    ),
    history: (
        <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
        </>
    ),
    users: (
        <>
            <circle cx="10" cy="8.5" r="3" />
            <path d="M4.5 20v-1.2A3.8 3.8 0 0 1 8.3 15h3.4a3.8 3.8 0 0 1 3.8 3.8V20" />
            <path d="M16 5.7a3 3 0 0 1 0 5.6M19.5 20v-1.2a3.8 3.8 0 0 0-2.4-3.5" />
        </>
    ),
    copy: (
        <>
            <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
            <path d="M15.5 8.5V6.5A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2" />
        </>
    ),
    image: (
        <>
            <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4" />
        </>
    ),
    search: (
        <>
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
        </>
    ),
    eye: (
        <>
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="2.8" />
        </>
    ),
    eyeOff: (
        <>
            <path d="M4 4l16 16" />
            <path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8M6.2 7.4A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9.5 9.5 0 0 0 3.3-.6" />
        </>
    ),
    logout: (
        <>
            <path d="M10 4H5v16h5" />
            <path d="M15 8l4 4-4 4M19 12H9" />
        </>
    ),
} as const;

export type IconName = keyof typeof PATHS;

type Props = Omit<SVGProps<SVGSVGElement>, "name"> & {
    name: IconName;
    size?: number;
};

export default function Icon({ name, size = 20, ...rest }: Props) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            {...rest}
        >
            {PATHS[name]}
        </svg>
    );
}
