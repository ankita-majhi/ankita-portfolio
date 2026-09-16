"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export default function MotionDetails() {
  const [paused, setPaused] = useState(false);
  const revealed = useRef(new WeakSet<Element>());
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPaused(media.matches);
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = paused ? "paused" : "active";
    const animations = new Set<Animation>();
    const targets = document.querySelectorAll<HTMLElement>(".section-label, .about-grid, .section-heading, .project-card, .skill-card, .timeline article, .contact-card, .contact-form");
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (revealed.current.has(entry.target)) { observer.unobserve(entry.target); return; }
        revealed.current.add(entry.target);
        if (!paused) {
          const animation = entry.target.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 600, easing: "cubic-bezier(.2,.7,.2,1)" });
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        }
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    targets.forEach(target => observer.observe(target));
    const heroArt = document.querySelector<HTMLElement>(".hero-art");
    const artObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { (entry.target as HTMLElement).dataset.inView = String(entry.isIntersecting); });
    }, { rootMargin: "80px" });
    if (heroArt) artObserver.observe(heroArt);
    const visibility = () => { document.documentElement.dataset.pageHidden = String(document.hidden); };
    document.addEventListener("visibilitychange", visibility);
    visibility();
    let frame = 0;
    const update = () => {
      frame = 0;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      document.documentElement.style.setProperty("--scroll-progress", String(range > 0 ? window.scrollY / range : 0));
      document.querySelector(".header")?.classList.toggle("scrolled", window.scrollY > 25);
      let active = "";
      document.querySelectorAll<HTMLElement>("main section[id]").forEach(section => { if(section.getBoundingClientRect().top < 190) active = section.id; });
      document.querySelectorAll<HTMLAnchorElement>(".nav a").forEach(link => { if(link.hash === `#${active}`) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current"); });
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll); update();
    const resizeObserver = new ResizeObserver(scroll);
    resizeObserver.observe(document.body);
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const pointer = (event: PointerEvent) => {
      if (paused || !finePointer.matches) return;
      const target = (event.target as HTMLElement).closest<HTMLElement>(".hero-art, .project-image, .skill-card");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--pointer-x", `${(event.clientX - rect.left) / rect.width * 100}%`);
      target.style.setProperty("--pointer-y", `${(event.clientY - rect.top) / rect.height * 100}%`);
      target.style.setProperty("--tilt-x", `${((event.clientY - rect.top) / rect.height - .5) * -2.5}deg`);
      target.style.setProperty("--tilt-y", `${((event.clientX - rect.left) / rect.width - .5) * 2.5}deg`);
    };
    const reset = (event: PointerEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(".hero-art, .project-image, .skill-card");
      if(target && (!(event.relatedTarget instanceof Node) || !target.contains(event.relatedTarget))) { target.style.setProperty("--tilt-x", "0deg"); target.style.setProperty("--tilt-y", "0deg"); }
    };
    document.addEventListener("pointermove", pointer, { passive: true });
    document.addEventListener("pointerout", reset, { passive: true });
    return () => { observer.disconnect(); artObserver.disconnect(); document.removeEventListener("visibilitychange", visibility); resizeObserver.disconnect(); animations.forEach(animation => animation.cancel()); cancelAnimationFrame(frame); window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll); document.removeEventListener("pointermove", pointer); document.removeEventListener("pointerout", reset); };
  }, [paused]);
  return <><div className="reading-progress" aria-hidden="true"/><button type="button" className="motion-control" onClick={() => setPaused(!paused)} aria-label={paused ? "Enable animations" : "Pause animations"} aria-pressed={paused}>{paused ? <Play size={13}/> : <Pause size={13}/>}<span>Motion {paused ? "off" : "on"}</span></button></>;
}
