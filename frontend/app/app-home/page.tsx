import HamburgerMenu from "@/components/HamburgerMenu";
import ServiceCard from "@/components/ServiceCard";
import Image from "next/image";

export default function AppHomePage() {
  return (
    <main className="relative min-h-screen">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat opacity-[0.06]"
        style={{ backgroundImage: 'url("/usebackground.png")' }}
      />

      {/* Animated floating decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ transformStyle: "preserve-3d" }}>
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-teal/10 animate-[float-1_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-teal/10 animate-[float-2_10s_ease-in-out_infinite]" />
        <div className="absolute left-1/4 top-1/3 h-20 w-20 rounded-full bg-teal/10 animate-[float-3_7s_ease-in-out_infinite]" />
        <div className="absolute left-[15%] top-[15%] text-4xl text-teal/20 animate-[spin-plus_12s_linear_infinite]" style={{ transformStyle: "preserve-3d" }}>+</div>
        <div className="absolute right-[20%] bottom-[20%] text-3xl text-teal/20 animate-[spin-plus_15s_linear_infinite_2s]" style={{ transformStyle: "preserve-3d" }}>+</div>
      </div>

      <header className="relative flex items-center justify-between px-5 py-4">
        <HamburgerMenu />
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-teal/20 shadow animate-[logo-float-3d_6s_ease-in-out_infinite]">
            <Image src="/logo.png" alt="NudMedi" width={36} height={36} className="h-full w-full object-cover" />
          </div>
          <span className="gradient-text font-display text-lg font-bold tracking-wider">NUDMEDI</span>
        </div>
        <div className="h-10 w-10" />
      </header>

      <section className="relative z-10 mx-auto flex max-w-md flex-col items-center px-5 pt-10">
        <h1 className="font-display text-xl font-semibold text-ink">เลือกบริการ</h1>
        <p className="mt-1 text-center text-sm text-ink/55">แตะเพื่อเริ่มใช้บริการ</p>

        <div className="mt-8 grid w-full grid-cols-2 gap-4">
          <ServiceCard
            href="/booking"
            label="จองคิว"
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
                <path d="M9 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <ServiceCard
            href="#"
            label="ปรึกษาแพทย์ออนไลน์"
            disabled
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 10c0 2.8-2.2 5-5 5H7l-3 3v-8c0-2.8 2.2-5 5-5h4c2.8 0 5 2.2 5 5z" />
              </svg>
            }
          />
          <ServiceCard
            href="#"
            label="ผลตรวจ"
            disabled
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 3h6v4a3 3 0 003 3v8a3 3 0 01-3 3H9a3 3 0 01-3-3v-8a3 3 0 003-3V3z" />
              </svg>
            }
          />
          <ServiceCard
            href="#"
            label="สั่งยาซ้ำ"
            disabled
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path d="M12 8v8M8 12h8" strokeLinecap="round" />
              </svg>
            }
          />
        </div>

        {/* --- SOS 1669 button --- */}
        <a
          href="tel:1669"
          className="mt-8 block w-full max-w-[200px] transition hover:scale-105 active:scale-95"
        >
          <Image
            src="/botton1669.png"
            alt="โทร 1669"
            width={200}
            height={80}
            className="h-auto w-full"
          />
        </a>
      </section>
    </main>
  );
}
