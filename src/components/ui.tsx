"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="label-mono block">{label}</label>}
      <input className={cn("input-field", className)} {...props} />
      {error && <p className="text-xs text-needs-attention">{error}</p>}
    </div>
  );
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="label-mono block">{label}</label>}
      <textarea
        className={cn("input-field min-h-[100px] resize-y", className)}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="label-mono block">{label}</label>}
      <select className={cn("input-field", className)} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "clay";
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        variant === "primary"
          ? "btn-primary"
          : variant === "clay"
            ? "btn-clay"
            : "btn-secondary",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} />
      <div className="panel-block relative z-10 w-full max-w-lg">
        <div className="panel-header">
          <h2 className="text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="panel-body">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-ink-faint">{message}</p>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-base text-ink-soft">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
