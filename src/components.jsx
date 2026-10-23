// The pklnx components: Carbon React components with pklnx defaults, plus the brand parts
// Carbon has no component for (Logo, Prompt). Built into one classic script by scripts/build.mjs.
import React from 'react';
import {
  Button as CButton, CodeSnippet, Tile, Link, TextInput, TextArea,
  Header, HeaderName, HeaderNavigation, HeaderMenuItem, SkipToContent,
  preview__IconIndicator as IconIndicator,
} from '@carbon/react';
import {
  Terminal, BareMetalServer, Email, Cloud, Security, Password, Earth, ArrowRight,
  Launch, Checkmark, Close, Copy, DataBase, Locked,
} from '@carbon/icons-react';

/* global __PKLNX_LOGO__ */
const GEO = __PKLNX_LOGO__;
const cx = (...a) => a.filter(Boolean).join(' ');

/** Wordmark or mark. Text and bracket follow CSS `color`, the star is always `--star` unless `mono`. */
export function Logo({ variant = 'wordmark', height, mono = false, title = 'pklnx.space', className }) {
  const g = variant === 'mark' ? GEO.mark : GEO.word;
  const vb = g.viewBox.split(' ').map(Number);
  const h = height || (variant === 'mark' ? 48 : 40);
  const w = Math.round((h * vb[2]) / vb[3] * 100) / 100;
  const star = { fill: mono ? 'currentColor' : 'var(--star)' };
  return (
    <svg viewBox={g.viewBox} width={w} height={h} role="img" aria-label={title} className={cx('pk-logo', className)}>
      {variant === 'mark' ? null : <path fill="currentColor" d={g.text} />}
      <path style={star} d={g.star} />
      <path fill="currentColor" d={g.bracket} />
    </svg>
  );
}

const ICONS = {
  terminal: Terminal, server: BareMetalServer, mail: Email, cloud: Cloud, shield: Security, key: Password,
  globe: Earth, 'arrow-right': ArrowRight, external: Launch, check: Checkmark, close: Close, copy: Copy,
  database: DataBase, lock: Locked,
};
const STAR = 'M10.8 2 L13.2 2 L15.4 8.6 L22 10.8 L22 13.2 L15.4 15.4 L13.2 22 L10.8 22 L8.6 15.4 L2 13.2 L2 10.8 L8.6 8.6 Z';

/** Carbon icon by pklnx name, or the brand star. 16, 20, 24 or 32px. */
export function Icon({ name, size = 20, label, className }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  if (name === 'star') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={cx('pk-icon', className)} {...a11y}>
        <path style={{ fill: 'var(--star)' }} d={STAR} />
      </svg>
    );
  }
  const C = ICONS[name];
  return C ? <C size={size} className={cx('pk-icon', className)} {...a11y} /> : null;
}

/** Carbon Button. `kind` primary at most once per view. `icon` is a pklnx icon name. */
export function Button({ kind, variant, icon, size = 'lg', children, ...rest }) {
  const k = kind || ({ primary: 'primary', secondary: 'secondary', ghost: 'ghost' })[variant] || 'secondary';
  const C = icon ? ICONS[icon] : undefined;
  return <CButton kind={k} size={size} renderIcon={C} {...rest}>{children}</CButton>;
}

/** Section heading as a shell prompt: `$ ls ./services`. */
export function Prompt({ cmd, as = 'h2', id, className, children }) {
  const Tag = as;
  return (
    <Tag id={id} className={cx('pk-prompt', as === 'h3' && 'pk-prompt--h3', className)}>
      <span className="pk-prompt__sign" aria-hidden="true">$</span> {cmd || children}
    </Tag>
  );
}

const STATUS = {
  ok: ['succeeded', 'Running'], warn: ['caution-minor', 'Maintenance'], err: ['failed', 'Down'], off: ['not-started', 'Off'],
  info: ['informative', 'Notice'],
};
/** Carbon icon indicator: shape, color and word. Never color alone. */
export function StatusBadge({ status = 'ok', children, size = 16, className }) {
  const [kind, word] = STATUS[status] || STATUS.ok;
  return <IconIndicator kind={kind} label={children || word} size={size} className={className} />;
}

/** A service or project as a Carbon tile: name, status, host link, one sentence. */
export function ServiceCard({ name, host, href, status, children, className }) {
  return (
    <Tile className={cx('pk-card', className)}>
      <div className="pk-card__head">
        <h3 className="pk-card__title">{name}</h3>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      {children ? <p className="pk-card__body">{children}</p> : null}
      {host ? (
        <div className="pk-card__foot">
          <Link className="pk-card__host" href={href || `https://${host}`} renderIcon={Launch}>{host}</Link>
        </div>
      ) : null}
    </Tile>
  );
}

/** Carbon code snippet with a label above. Single line for one command, multi for blocks. */
export function CodeBlock({ code = '', label, type, copyable = true, className }) {
  const t = type || (code.includes('\n') ? 'multi' : 'single');
  return (
    <div className={cx('pk-code', className)}>
      {label ? <span className="pk-code__label">{label}</span> : null}
      <CodeSnippet type={t} hideCopyButton={!copyable} feedback="Copied" copyButtonDescription="Copy code"
        aria-label={label || 'Code'} showMoreText="Show more" showLessText="Show less" wrapText={false}>
        {code}
      </CodeSnippet>
    </div>
  );
}

/** Carbon text input or text area with label, helper text and error. */
export function TextField({ id, label, hint, error, multiline = false, ...rest }) {
  const C = multiline ? TextArea : TextInput;
  return <C id={id} labelText={label} helperText={hint} invalid={!!error} invalidText={error} size={multiline ? undefined : 'lg'} {...rest} />;
}

/** Carbon UI shell header with the wordmark and up to five links. `fixed` pins it to the top. */
export function SiteHeader({ links = [], homeHref = '/', logoHeight = 22, fixed = false, contentId = 'main', className }) {
  return (
    <Header aria-label="pklnx.space" className={cx(!fixed && 'pk-header', className)}>
      <SkipToContent href={`#${contentId}`}>Skip to main content</SkipToContent>
      <HeaderName href={homeHref} prefix="">
        <Logo height={logoHeight} title="pklnx.space, home" />
      </HeaderName>
      {links.length ? (
        <HeaderNavigation aria-label="Main navigation">
          {links.map((l) => (
            <HeaderMenuItem key={l.href} href={l.href} isActive={!!l.current} aria-current={l.current ? 'page' : undefined}>{l.label}</HeaderMenuItem>
          ))}
        </HeaderNavigation>
      ) : null}
    </Header>
  );
}

window.Pklnx = Object.assign(window.Pklnx || {}, { Logo, Icon, Button, Prompt, StatusBadge, ServiceCard, CodeBlock, TextField, SiteHeader });
