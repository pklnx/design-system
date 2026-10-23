/** pklnx components: Carbon React with pklnx defaults plus the brand parts. Global: window.Pklnx. React 18. */
import type * as React from 'react';

export type IconName = 'terminal' | 'server' | 'mail' | 'cloud' | 'shield' | 'key' | 'lock' | 'database' | 'globe' | 'arrow-right' | 'external' | 'check' | 'close' | 'copy' | 'star';
export type Status = 'ok' | 'warn' | 'err' | 'info' | 'off';

/** Wortmarke oder Bildmarke als Inline-SVG. Farbe über CSS `color`, Stern immer `--star` (außer `mono`). */
export interface LogoProps { variant?: 'wordmark' | 'mark'; height?: number; mono?: boolean; title?: string; className?: string; }
export declare function Logo(props: LogoProps): React.ReactElement;

/** Carbon Icon unter pklnx-Namen, oder der Stern. Farbe über `currentColor`. */
export interface IconProps { name: IconName; size?: 16 | 20 | 24 | 32; label?: string; className?: string; }
export declare function Icon(props: IconProps): React.ReactElement;

/** Carbon Button, Größe `lg`. `kind="primary"` höchstens einmal pro Ansicht. */
export interface ButtonProps { kind?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'danger--tertiary' | 'danger--ghost'; icon?: IconName; href?: string; size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'; disabled?: boolean; onClick?: React.MouseEventHandler; type?: 'button' | 'submit' | 'reset'; children?: React.ReactNode; }
export declare function Button(props: ButtonProps): React.ReactElement;

/** Abschnittsüberschrift als Shell-Prompt: `$ ls ./services`. */
export interface PromptProps { cmd?: string; as?: 'h1' | 'h2' | 'h3'; id?: string; className?: string; children?: React.ReactNode; }
export declare function Prompt(props: PromptProps): React.ReactElement;

/** Carbon Icon Indicator: Form, Farbe und Wort. Standardwörter: läuft, Wartung, gestört, Hinweis, aus. */
export interface StatusBadgeProps { status?: Status; size?: 16 | 20; className?: string; children?: string; }
export declare function StatusBadge(props: StatusBadgeProps): React.ReactElement;

/** Carbon Tile für einen Dienst: Name, Status, Beschreibung, Host-Link. */
export interface ServiceCardProps { name: string; host?: string; href?: string; status?: Status; className?: string; children?: React.ReactNode; }
export declare function ServiceCard(props: ServiceCardProps): React.ReactElement;

/** Carbon Code Snippet mit Label. Eine Zeile `single`, mehrere `multi`. */
export interface CodeBlockProps { code: string; label?: string; type?: 'single' | 'multi' | 'inline'; copyable?: boolean; className?: string; }
export declare function CodeBlock(props: CodeBlockProps): React.ReactElement;

/** Carbon Text Input oder Text Area mit Label, Hinweis und Fehlermeldung. */
export interface TextFieldProps { id: string; label: string; hint?: string; error?: string; multiline?: boolean; placeholder?: string; value?: string; defaultValue?: string; rows?: number; onChange?: React.ChangeEventHandler; }
export declare function TextField(props: TextFieldProps): React.ReactElement;

/** Carbon UI Shell Header mit Wortmarke und bis zu fünf Links. */
export interface SiteHeaderProps { links?: { label: string; href: string; current?: boolean }[]; homeHref?: string; logoHeight?: number; fixed?: boolean; contentId?: string; className?: string; }
export declare function SiteHeader(props: SiteHeaderProps): React.ReactElement;
