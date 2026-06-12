import { useEffect, useRef, useState } from "react"
import { Loader as Loader2 } from "lucide-react"

interface Particle {
  x: number
  y: number
  speed: number
  opacity: number
  fadeDelay: number
  fadeStart: number
  fadingOut: boolean
  reset: () => void
  update: () => void
  draw: (ctx: CanvasRenderingContext2D) => void
}

interface ParticleHeroProps {
  isLoggingIn: boolean;
  onLogin: () => void;
  authError?: string | null;
}

export function ParticleHero({ isLoggingIn, onLogin, authError }: ParticleHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isGoldMode, setIsGoldMode] = useState(false)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>()

  const createParticle = (canvas: HTMLCanvasElement): Particle => {
    const particle = {
      x: 0,
      y: 0,
      speed: 0,
      opacity: 1,
      fadeDelay: 0,
      fadeStart: 0,
      fadingOut: false,
      reset() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.speed = Math.random() / 5 + 0.1
        this.opacity = 1
        this.fadeDelay = Math.random() * 600 + 100
        this.fadeStart = Date.now() + this.fadeDelay
        this.fadingOut = false
      },
      update() {
        this.y -= this.speed
        if (this.y < 0) {
          this.reset()
        }

        if (!this.fadingOut && Date.now() > this.fadeStart) {
          this.fadingOut = true
        }

        if (this.fadingOut) {
          this.opacity -= 0.008
          if (this.opacity <= 0) {
            this.reset()
          }
        }
      },
      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = `rgba(${255 - (Math.random() * 255) / 2}, 255, 255, ${this.opacity})`
        ctx.fillRect(this.x, this.y, 0.4, Math.random() * 2 + 1)
      },
    }

    particle.reset()
    particle.y = Math.random() * canvas.height
    particle.fadeDelay = Math.random() * 600 + 100
    particle.fadeStart = Date.now() + particle.fadeDelay
    particle.fadingOut = false

    return particle
  }

  const calculateParticleCount = (canvas: HTMLCanvasElement) => {
    return Math.floor((canvas.width * canvas.height) / 5000)
  }

  const initParticles = (canvas: HTMLCanvasElement) => {
    const particleCount = calculateParticleCount(canvas)
    particlesRef.current = []
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push(createParticle(canvas))
    }
  }

  const animate = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particlesRef.current.forEach((particle) => {
      particle.update()
      particle.draw(ctx)
    })
    animationRef.current = requestAnimationFrame(() => animate(canvas, ctx))
  }

  const handleResize = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    initParticles(canvas)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    initParticles(canvas)
    animate(canvas, ctx)

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const toggleGoldMode = () => {
    setIsGoldMode(!isGoldMode)
  }

  return (
    <div
      className={`absolute inset-0 w-full h-full min-h-screen overflow-y-auto flex flex-col items-center justify-start ${isGoldMode ? "gold-mode" : ""}`}
      style={{ 
        background: "#05060f",
        backgroundImage: "linear-gradient(0deg,rgba(216,236,248,.06),rgba(152,192,239,.06))",
        fontSize: "max(calc(min(600px, 80vh) * 0.03), 10px)",
        WebkitFontSmoothing: "antialiased",
        textRendering: "optimizeLegibility",
        scrollBehavior: "smooth",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .gold-mode .header h2,
        .gold-mode p,
        .gold-mode > * > * :not(.contact-btn) {
          filter: invert(1) brightness(4.7);
        }
        .gold-mode .header h2 a {
          filter: hue-rotate(0deg);
        }
        .gold-mode canvas {
          filter: drop-shadow(2em 4em 0px #d8bd10) drop-shadow(-8em -14em 0px #d8bd10);
        }
        .gold-mode .header .spotlight {
          filter: invert(1) brightness(4.7) opacity(0.5);
        }
        .gold-mode .mountains > div {
          box-shadow: 
            -1em -0.2em 0.4em -1.1em #c2ccff,
            inset 0em 0em 0em 2px #d8a910,
            inset 0.2em 0.3em 0.2em -0.2em #c2ccff,
            inset 10.2em 10.3em 2em -10em #d4e6ff2f;
        }
        .gold-mode .content-section,
        .gold-mode .content-section ::before,
        .gold-mode .content-section ::after {
          filter: invert(1) brightness(4.4) opacity(1);
        }
        .gold-mode .header > div.mid-spot {
          box-shadow: 0 0 1em 0 #d8bd10;
        }
        .gold-mode .header > div.mid-spot:hover {
          box-shadow: -0.3em 0.1em 0.2em 0 #98c0ef;
        }

        /* Float background narrative animated text */
        .scrolling-narrative-box {
          animation: float-text 10s ease-in-out infinite;
        }

        @keyframes float-text {
          0% { transform: translateY(0px) scale(0.99); opacity: 0.9; filter: drop-shadow(0 2px 10px rgba(250, 246, 235, 0.15)); }
          50% { transform: translateY(-8px) scale(1.01); opacity: 1.0; filter: drop-shadow(0 6px 20px rgba(254, 253, 250, 0.35)); }
          100% { transform: translateY(0px) scale(0.99); opacity: 0.9; filter: drop-shadow(0 2px 10px rgba(250, 246, 235, 0.15)); }
        }

        @keyframes load {  
          0% { opacity: 0;}    
          100% { opacity: 1;}    
        }
        @keyframes up {      
          100% { transform: translateY(0); }    
        }
        @keyframes load3 {  
          0% { opacity: 0;}    
          100% { opacity: 0.7;}    
        }
        @keyframes pulse { 
          0% { --p: 0%; }
          50% { --p: 300%;}
          100% { --p: 300%;}
        }
        @keyframes colorize {
          0%{filter: hue-rotate(0deg); }
          100% {filter: hue-rotate(-380deg);}
        }
        @keyframes spotlight {
          0% {
            transform: rotateZ(0deg) scale(1);
            filter: blur(15px) opacity(0.5);
          }
          20% {
            transform: rotateZ(-1deg) scale(1.2);
            filter: blur(16px) opacity(0.6);
          }    
          40% {
            transform: rotateZ(2deg) scale(1.3);
            filter: blur(14px) opacity(0.4);
          }    
          60% {
            transform: rotateZ(-2deg) scale(1.2);
            filter: blur(15px) opacity(0.6);
          }    
          80% {
            transform: rotateZ(1deg) scale(1.1);
            filter: blur(13px) opacity(0.4);
          }    
          100% {
            transform: rotateZ(0deg) scale(1);
            filter: blur(15px) opacity(0.5);
          }    
        }
        @keyframes loadrot {
          0% { transform: rotate(0deg) scale(0);}
          100% { transform: scale(1);}
        }
        @keyframes accentload {
          0% {
            opacity: 0; transform: scale(0);
          }
          100% {
            opacity: 1; transform: scale(1);
          }
        }
        @keyframes accentload2 {
          0% {
            opacity: 0; transform: scale(0) rotate(360deg);
          }
          50% { transform: scale(0); }
          100% {
            opacity: 0.12; transform: scale(1) rotate(0deg);
          }
        }
        @keyframes accentload3 {
          0% {
            opacity: 0; transform: scale(0) rotate(-360deg);
          }
          50% { transform: scale(0); }
          100% {
            opacity: 0.12; transform: scale(1) rotate(5deg);
          }
        }
        @property --p {
          syntax: '<percentage>';
          inherits: false;
          initial-value: 0%;
        }
      ` }} />

      {/* Spot controller dialect */}
      <div
        className="header"
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "center",
          color: "#bad6f7",
          padding: "1.5em",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          margin: "0 auto",
          opacity: 0,
          transform: "translateY(-1em)",
          animation: "load 2s ease-in 2s forwards, up 1.4s ease-out 2s forwards",
          zIndex: 5
        }}
      >
        <div
          className="mid-spot"
          onClick={toggleGoldMode}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            margin: "0 auto",
            width: "1.8em",
            height: "1.8em",
            borderRadius: "50%",
            background: "black",
            boxShadow: "0 0 1em 0 #98c0ef",
            cursor: "pointer",
            zIndex: 10,
            transition: "box-shadow 1s ease-in-out",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = isGoldMode
              ? "-0.3em 0.1em 0.2em 0 #98c0ef"
              : "-0.3em 0.1em 0.2em 0 #d8bd10"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = isGoldMode ? "0 0 1em 0 #d8bd10" : "0 0 1em 0 #98c0ef"
          }}
        />

        <div
          className="spotlight"
          style={{
            pointerEvents: "none",
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            margin: "0 auto",
            transition: "filter 1s ease-in-out",
            height: "36em",
            width: "100%",
            overflow: "hidden",
            zIndex: 1
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                borderRadius: "0 0 50% 50%",
                position: "absolute",
                left: 0,
                right: 0,
                margin: "0 auto",
                top: "2em",
                width: "26em",
                height: "max(36em, 78vh)",
                backgroundImage:
                  "conic-gradient(from 0deg at 50% -5%, transparent 45%, rgba(124, 145, 182, .3) 49%, rgba(124, 145, 182, .5) 50%, rgba(124, 145, 182, .3) 51%, transparent 55%)",
                transformOrigin: "50% 0",
                filter: "blur(15px) opacity(0.5)",
                zIndex: -1,
                transform: i === 0 ? "rotate(16deg)" : i === 1 ? "rotate(-16deg)" : "rotate(0deg)",
                animation:
                  i === 0
                    ? "load 2s ease-in-out forwards, loadrot 2s ease-in-out forwards, spotlight 17s ease-in-out infinite"
                    : i === 1
                      ? "load 2s ease-in-out forwards, loadrot 2s ease-in-out forwards, spotlight 14s ease-in-out infinite"
                      : "load 2s ease-in-out forwards, loadrot 2s ease-in-out forwards, spotlight 21s ease-in-out infinite reverse",
              }}
            />
          ))}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        id="particleCanvas"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          animation: "load 0.4s ease-in-out forwards",
          zIndex: 1,
          width: "100%",
          height: "100%"
        }}
      />

      {/* Accent Lines */}
      <div
        className="accent-lines"
        style={{
          pointerEvents: "none",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      >
        <div style={{ position: "absolute", top: 0, right: 0, left: 0, margin: "auto", height: "100%", width: "100%" }}>
          {[5, 10, 15, 22, 27, 35, 45].map((top, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: `${top}em`,
                right: 0,
                left: 0,
                margin: "auto",
                width: "100%",
                height: "1px",
                background: "linear-gradient(90deg, transparent, rgba(186, 215, 247, .12), transparent)",
                opacity: 0,
                transform: "scale(0)",
                animation: "accentload 2s ease-out 2.4s forwards",
              }}
            />
          ))}
        </div>
        <div style={{ position: "absolute", top: 0, right: 0, left: 0, margin: "auto", height: "100%", width: "100%" }}>
          {[18, 28, -18, -28].map((left, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0,
                left: left > 0 ? `${left}em` : "auto",
                right: left < 0 ? `${Math.abs(left)}em` : "auto",
                margin: "auto",
                width: "1px",
                height: "100%",
                background: "rgba(186, 215, 247, .09)",
                opacity: 0,
                transform: "scale(0)",
                animation: "accentload 2s ease-out 2s forwards",
              }}
            />
          ))}
        </div>
      </div>

      {/* ELEVATED FOREGROUND INTERACTIVE CONTENT */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-6 text-center flex flex-col items-center justify-start gap-8 my-auto py-12">
        
        {/* Shimmering Display Logo / Title */}
        <div className="hero h-[120px] flex justify-center items-center">
          <div
            className="heroT"
            style={{
              height: "fit-content",
              opacity: 0,
              animation: "load 2s ease-in-out 0.6s forwards",
            }}
          >
            <h1
              style={{
                fontSize: "3.2em",
                fontWeight: 800,
                color: "#9dc3f7",
                background: `
                  radial-gradient(1.5em 1.5em at 50% 50%,
                    transparent calc(var(--p, 0%) - 1.5em),
                    #fff calc(var(--p, 0%) - 0.8em), 
                    #fff calc(var(--p, 0%) - 0.3em), 
                    transparent var(--p, 0%) 
                  ),
                  linear-gradient(0deg, #bad1f1 30%, #9dc3f7 100%)
                `,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 2px 20px rgba(174,207,242,.24)",
                transition: "--p 3s linear",
                animation: "pulse 10s linear 1.2s infinite",
              }}
              className="m-0 tracking-tight font-display"
            >
              AURA<span className="font-light">PITCH</span> 360
            </h1>
            <p className="text-[10px] tracking-[0.3em] uppercase font-mono font-bold text-slate-500/80 mt-1 mb-0">
              Automated Grounded Outreach Router
            </p>
          </div>
        </div>

        {/* FULLY VISIBLE, NON-OVERLAPPED CREAM/BEIGE FLOATING NARRATIVE BOARD */}
        <div className="scrolling-narrative-box w-full max-w-lg px-6 py-6 rounded-2xl bg-[#040b10]/40 border border-teal-500/10 backdrop-blur-md relative select-none">
          <div 
            className="font-mono text-xs uppercase tracking-[0.3em] font-extrabold text-teal-300/80 mb-2"
          >
            Unified Intelligence Sandbox
          </div>
          <p 
            className="text-xs md:text-sm tracking-wide font-sans font-medium leading-relaxed max-w-md mx-auto m-0 text-[#fbf6eb]"
            style={{
              textShadow: "0 2px 10px rgba(251, 246, 235, 0.45)",
            }}
          >
            AuraPitch 360 leverages Deep Search-Grounded AI brand research algorithms to generate specific benefit angles directly inside your private cloud sandbox.
          </p>
        </div>

        {/* Auth error panel */}
        {authError && (
          <div className="w-full bg-red-950/40 backdrop-blur-md border border-red-500/30 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-red-400 font-bold text-xs font-mono uppercase tracking-wider shrink-0 mt-0.5">Auth Error</span>
              <span className="text-red-300 text-xs font-mono leading-relaxed">{authError}</span>
            </div>
            <div className="border-t border-red-500/20 pt-3 space-y-1.5">
              <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">Fix: Add this domain to Firebase Console</p>
              <code className="block bg-black/40 border border-teal-900/40 rounded-lg px-3 py-2 text-[11px] text-teal-300 font-mono break-all select-all">
                {typeof window !== "undefined" ? window.location.hostname : "your-preview-domain"}
              </code>
              <ol className="text-[10px] text-slate-400 font-mono space-y-1 list-decimal list-inside leading-relaxed">
                <li>Go to Firebase Console → Authentication → Settings → Authorized domains</li>
                <li>Click <strong className="text-slate-300">Add domain</strong> and paste the hostname above</li>
                <li>Save and reload this page, then try signing in again</li>
              </ol>
            </div>
          </div>
        )}

        {/* The glassmorphic Login container */}
        <div
          style={{
            animation: "load 1.5s ease-out 0.8s forwards, up 1.2s ease-out 0.8s forwards",
            opacity: 0,
            transform: "translateY(1.5em)",
          }}
          className="w-full bg-[#040b10]/80 backdrop-blur-2xl border border-teal-900/30 rounded-3xl p-8 shadow-[0_0_80px_rgba(20,184,166,0.06)] relative overflow-hidden"
        >
          {/* Subtle interior glow effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/[0.03] via-transparent to-cyan-500/[0.03] pointer-events-none" />

          {/* Authorization Label */}
          <span className="text-[10px] bg-teal-500/10 border border-teal-500/20 text-teal-300 font-mono font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full mb-6 inline-block">
            Secure Auth Gateway
          </span>

          <p className="text-xs text-slate-400 font-sans leading-relaxed mb-6 max-w-xs mx-auto">
            Authorize campaign structures. Access custom prospecting channels with isolated state management.
          </p>

          <button
            id="google-login-btn"
            disabled={isLoggingIn}
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 border border-teal-500/20 font-bold rounded-2xl text-white bg-teal-500 hover:bg-teal-400 active:scale-[0.98] transition-all duration-200 cursor-pointer text-xs uppercase tracking-[0.15em] disabled:opacity-50 hover:shadow-[0_0_30px_rgba(20,184,166,0.3)] shadow-md"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-100" />
                <span>Authorizing Identity Client...</span>
              </>
            ) : (
              <>
                {/* Custom inline Google vector icon */}
                <svg className="w-4 h-4 fill-current shrink-0 text-white" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.136 4.113-3.41 0-6.166-2.766-6.166-6.17a6.16 6.16 0 0 1 6.166-6.17c1.494 0 2.859.531 3.93 1.54l3.1-3.1C18.892 1.761 15.753.8 12.24.8 5.753.8.5 6.052.5 12.5s5.253 11.7 11.74 11.7c7.252 0 11.316-5.1 11.316-11.5 0-.74-.067-1.415-.192-2.025l-11.125.01Z"/>
                </svg>
                <span>Connect with Google</span>
              </>
            )}
          </button>

          <div className="mt-5 text-center">
            <span className="text-[9.5px] text-slate-500 font-mono tracking-wider">
              Protected by isolated Google Workspace OAuth &bull; Firestore
            </span>
          </div>
        </div>

        <div className="text-center" style={{ opacity: 0.6 }}>
          <span className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">
            AuraPitch 360 Workspace
          </span>
        </div>

      </div>

    </div>
  )
}
