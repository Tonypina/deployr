import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-card auth-card-md">
        <div className="auth-header pb-6">
          <Image
            src="/logo.png"
            alt="deployr"
            width={120}
            height={48}
            className="object-contain object-left"
            priority
          />
        </div>
        {children}
      </div>
    </div>
  );
}
