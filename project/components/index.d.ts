/** pklnx components: Carbon React with pklnx defaults plus the brand parts. Global: window.Pklnx. React 18. */
import type * as React from 'react';

export type IconName = 'terminal' | 'server' | 'mail' | 'cloud' | 'shield' | 'key' | 'lock' | 'database' | 'globe' | 'arrow-right' | 'external' | 'check' | 'close' | 'copy' | 'star';
export type Status = 'ok' | 'warn' | 'err' | 'info' | 'off';

/** Wordmark or mark as inline SVG. Color through CSS `color`, the star always `--star` (except `mono`). */
export interface LogoProps { variant?: 'wordmark' | 'mark'; height?: number; mono?: boolean; title?: string; className?: string; }
export declare function Logo(props: LogoProps): React.ReactElement;

/** Carbon icon under a pklnx name, or the star. Color through `currentColor`. */
export interface IconProps { name: IconName; size?: 16 | 20 | 24 | 32; label?: string; className?: string; }
export declare function Icon(props: IconProps): React.ReactElement;

/** Carbon Button, size `lg`. `kind="primary"` at most once per view. */
export interface ButtonProps { kind?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'danger--tertiary' | 'danger--ghost'; icon?: IconName; href?: string; size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'; disabled?: boolean; onClick?: React.MouseEventHandler; type?: 'button' | 'submit' | 'reset'; children?: React.ReactNode; }
export declare function Button(props: ButtonProps): React.ReactElement;

/** Section heading as a shell prompt: `$ ls ./services`. */
export interface PromptProps { cmd?: string; as?: 'h1' | 'h2' | 'h3'; id?: string; className?: string; children?: React.ReactNode; }
export declare function Prompt(props: PromptProps): React.ReactElement;

/** Carbon Icon Indicator: shape, color and word. Default words (German UI): läuft, Wartung, gestört, Hinweis, aus. */
export interface StatusBadgeProps { status?: Status; size?: 16 | 20; className?: string; children?: string; }
export declare function StatusBadge(props: StatusBadgeProps): React.ReactElement;

/** Carbon Tile for a service: name, status, description, host link. */
export interface ServiceCardProps { name: string; host?: string; href?: string; status?: Status; className?: string; children?: React.ReactNode; }
export declare function ServiceCard(props: ServiceCardProps): React.ReactElement;

/** Carbon Code Snippet with a label. One line `single`, several `multi`. */
export interface CodeBlockProps { code: string; label?: string; type?: 'single' | 'multi' | 'inline'; copyable?: boolean; className?: string; }
export declare function CodeBlock(props: CodeBlockProps): React.ReactElement;

/** Carbon Text Input or Text Area with label, hint and error message. */
export interface TextFieldProps { id: string; label: string; hint?: string; error?: string; multiline?: boolean; placeholder?: string; value?: string; defaultValue?: string; rows?: number; onChange?: React.ChangeEventHandler; }
export declare function TextField(props: TextFieldProps): React.ReactElement;

/** Carbon UI Shell Header with the wordmark and up to five links. */
export interface SiteHeaderProps { links?: { label: string; href: string; current?: boolean }[]; homeHref?: string; logoHeight?: number; fixed?: boolean; contentId?: string; className?: string; }
export declare function SiteHeader(props: SiteHeaderProps): React.ReactElement;
