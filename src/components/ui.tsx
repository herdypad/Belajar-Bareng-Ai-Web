import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

type Variant = "filled" | "tonal" | "outlined" | "text" | "danger";

const variantClass: Record<Variant, string> = {
  filled:
    "bg-primary text-on-primary shadow-sm hover:shadow-md hover:brightness-110",
  tonal:
    "bg-secondary-container text-on-secondary-container hover:brightness-95 dark:hover:brightness-110",
  outlined:
    "border border-outline text-primary hover:bg-primary/8",
  text: "text-primary hover:bg-primary/8",
  danger: "bg-error text-white dark:text-on-error-container hover:brightness-110",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 h-10 text-sm font-medium transition-all duration-200 select-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97]";

interface CommonProps {
  variant?: Variant;
  icon?: IconName;
  children?: ReactNode;
}

export function Button({
  variant = "filled",
  icon,
  className,
  children,
  type = "button",
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(base, variantClass[variant], className)}
      {...props}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "filled",
  icon,
  className,
  children,
  href,
  ...props
}: CommonProps & { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <Link
      href={href}
      className={cn(base, variantClass[variant], className)}
      {...props}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </Link>
  );
}

export function IconButton({
  icon,
  label,
  className,
  active,
  ...props
}: {
  icon: IconName;
  label: string;
  active?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        active
          ? "bg-primary-container text-on-primary-container"
          : "text-on-surface-variant hover:bg-on-surface/8",
        className,
      )}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-surface-container-low p-5 ring-1 ring-outline-variant/60",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Chip({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "error" | "primary" | "warning";
  icon?: IconName;
}) {
  const tones = {
    neutral: "bg-surface-container-high text-on-surface-variant",
    success: "bg-success-container text-on-success-container",
    error: "bg-error-container text-on-error-container",
    primary: "bg-primary-container text-on-primary-container",
    warning: "bg-warning-container text-on-warning-container",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium",
        tones[tone],
      )}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="Memuat"
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}

export function PageLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-primary">
      <Spinner size={32} />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-outline-variant px-6 py-12 text-center animate-fade-in">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
        <Icon name={icon} size={26} />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-on-surface-variant">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "warning" | "success";
  children: ReactNode;
}) {
  const tones = {
    error: "bg-error-container text-on-error-container",
    warning: "bg-warning-container text-on-warning-container",
    success: "bg-success-container text-on-success-container",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-2xl px-4 py-3 text-sm animate-fade-in",
        tones[tone],
      )}
    >
      <Icon name={tone === "success" ? "check" : "alert"} className="mt-0.5 shrink-0" size={18} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
