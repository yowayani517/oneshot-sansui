import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createVideoScrubber } from "../lib/videoScrub";

gsap.registerPlugin(ScrollTrigger);

function splitLines(el: Element | null) {
  if (!el) return;
  const lines = el.querySelectorAll(".line > span");
  gsap.set(lines, { yPercent: 115 });
}

export function useScrollExperience(ready: boolean) {
  useLayoutEffect(() => {
    if (!ready) return;

    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const ticker = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);
    document.documentElement.classList.add("lenis");

    const scrubbers: Array<{ destroy: () => void }> = [];

    const ctx = gsap.context(() => {
      const loader = document.querySelector(".loader");
      const loaderBar = document.querySelector(".loader__bar span");

      const intro = gsap.timeline({
        onComplete: () => {
          gsap.set(loader, { display: "none" });
        },
      });

      intro
        .to(loaderBar, { scaleX: 1, duration: 1.1, ease: "power2.inOut" })
        .to(loader, { yPercent: -100, duration: 0.9, ease: "power3.inOut" }, "+=0.15");

      gsap.fromTo(
        ".hero__title .char",
        { yPercent: 120, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.1,
          stagger: 0.045,
          ease: "power3.out",
          delay: 1.2,
        },
      );

      gsap.fromTo(
        ".hero__kicker span, .hero__sub span",
        { yPercent: 100, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.12,
          ease: "power3.out",
          delay: 1.45,
        },
      );

      gsap.fromTo(
        ".hero__vertical",
        { opacity: 0 },
        { opacity: 0.75, duration: 1.2, delay: 1.7 },
      );

      gsap.to(".hero__media", {
        yPercent: 10,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      splitLines(document.querySelector(".poem__text"));

      gsap.to(".poem__jp", {
        letterSpacing: "0.2em",
        opacity: 1,
        duration: 1.2,
        scrollTrigger: {
          trigger: ".poem",
          start: "top 70%",
        },
      });

      gsap.to(".poem__text .line > span", {
        yPercent: 0,
        duration: 1.1,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".poem",
          start: "top 65%",
        },
      });

      gsap.fromTo(
        ".poem__seal",
        { scale: 0, rotate: 25 },
        {
          scale: 1,
          rotate: -4,
          duration: 0.7,
          ease: "back.out(1.6)",
          scrollTrigger: {
            trigger: ".poem",
            start: "top 55%",
          },
        },
      );

      // --- Craft scrub (cranes) ---
      const scrubEl = document.querySelector(".scrub__media");
      const scrubVideo =
        scrubEl instanceof HTMLVideoElement ? scrubEl : null;

      const bindPinnedScrub = (
        sectionSel: string,
        pinSel: string,
        video: HTMLVideoElement | null,
      ) => {
        const distance = "+=260%";

        if (video) {
          const scrubber = createVideoScrubber(video);
          scrubbers.push(scrubber);

          const pin = ScrollTrigger.create({
            trigger: sectionSel,
            start: "top top",
            end: distance,
            pin: pinSel,
            scrub: 1.25,
            onUpdate: (self) => {
              // Scroll down → forward, scroll up → reverse
              scrubber.setProgress(self.progress, {
                pingPong: false,
                pad: 0.05,
              });
            },
          });

          gsap.fromTo(
            `${pinSel} .bleed-crop`,
            { scale: 1.04 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: sectionSel,
                start: "top top",
                end: () => `+=${pin.end - pin.start}`,
                scrub: 1.25,
              },
            },
          );

          return pin;
        }

        return ScrollTrigger.create({
          trigger: sectionSel,
          start: "top top",
          end: "+=180%",
          pin: pinSel,
          scrub: 1,
        });
      };

      const scrubPin = bindPinnedScrub(
        ".scrub",
        ".scrub__pin",
        scrubVideo,
      );

      gsap.fromTo(
        ".scrub__kanji",
        { yPercent: -16 },
        {
          yPercent: 40,
          ease: "none",
          scrollTrigger: {
            trigger: ".scrub",
            start: "top top",
            end: () => `+=${scrubPin.end - scrubPin.start}`,
            scrub: 1.25,
          },
        },
      );

      gsap.fromTo(
        ".scrub__caption",
        { y: 100, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".scrub",
            start: "top top",
            end: () => `+=${(scrubPin.end - scrubPin.start) * 0.3}`,
            scrub: 1.25,
          },
        },
      );

      // Soft veil at scrub ends (helps loop feel)
      gsap.fromTo(
        ".scrub__edge",
        { opacity: 0.55 },
        {
          opacity: 0,
          ease: "none",
          scrollTrigger: {
            trigger: ".scrub",
            start: "top top",
            end: () => `+=${(scrubPin.end - scrubPin.start) * 0.18}`,
            scrub: 1,
          },
        },
      );

      gsap.to(".gallery__jp", {
        letterSpacing: "0.25em",
        opacity: 1,
        duration: 1,
        scrollTrigger: { trigger: ".gallery", start: "top 75%" },
      });

      gsap.fromTo(
        ".gallery__head h2 .char",
        { yPercent: 120, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          stagger: 0.03,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: ".gallery", start: "top 70%" },
        },
      );

      document.querySelectorAll(".panel").forEach((panel) => {
        const frame = panel.querySelector(".panel__img");
        const crop = panel.querySelector(".panel__crop");
        const media = panel.querySelector(".panel__media");
        const texts = panel.querySelectorAll(".panel__text > *");
        const video =
          media instanceof HTMLVideoElement
            ? media
            : media?.querySelector("video");

        // Hold empty, then float up into view
        if (frame) {
          gsap.set(frame, { opacity: 0, y: 84, filter: "blur(8px)" });
          if (video instanceof HTMLVideoElement) {
            video.pause();
            video.currentTime = 0;
            video.loop = false;
          }

          ScrollTrigger.create({
            trigger: panel,
            start: "top 78%",
            once: true,
            onEnter: () => {
              gsap.to(frame, {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 1.85,
                delay: 0.7,
                ease: "power3.out",
                onStart: () => {
                  if (video instanceof HTMLVideoElement) {
                    video.loop = false;
                    video.muted = true;
                    const p = video.play();
                    if (p && typeof p.catch === "function") {
                      p.catch(() => undefined);
                    }
                  }
                },
              });
            },
          });
        }

        if (crop) {
          gsap.fromTo(
            crop,
            { yPercent: -2 },
            {
              yPercent: 2,
              ease: "none",
              scrollTrigger: {
                trigger: panel,
                start: "top bottom",
                end: "bottom top",
                scrub: 1,
              },
            },
          );
        }

        gsap.fromTo(
          texts,
          { y: 44, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.08,
            duration: 0.9,
            delay: 0.35,
            ease: "power3.out",
            scrollTrigger: { trigger: panel, start: "top 65%" },
          },
        );
      });

      // --- Still scrub (horse) ---
      const stillEl = document.querySelector(".still__media");
      const stillVideo =
        stillEl instanceof HTMLVideoElement ? stillEl : null;

      const stillPin = bindPinnedScrub(
        ".still",
        ".still__pin",
        stillVideo,
      );

      gsap.fromTo(
        ".still__veil",
        { opacity: 0.85 },
        {
          opacity: 0.12,
          ease: "none",
          scrollTrigger: {
            trigger: ".still",
            start: "top top",
            end: () => `+=${(stillPin.end - stillPin.start) * 0.35}`,
            scrub: 1.25,
          },
        },
      );

      gsap.fromTo(
        ".still__jp, .still__sub",
        { y: 26, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          ease: "none",
          scrollTrigger: {
            trigger: ".still",
            start: "top top",
            end: () => `+=${(stillPin.end - stillPin.start) * 0.4}`,
            scrub: 1.25,
          },
        },
      );

      gsap.fromTo(
        ".still__content h2 .char",
        { yPercent: 120, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          stagger: 0.03,
          ease: "none",
          scrollTrigger: {
            trigger: ".still",
            start: "top top",
            end: () => `+=${(stillPin.end - stillPin.start) * 0.45}`,
            scrub: 1.25,
          },
        },
      );

      gsap.fromTo(
        ".cta__jp, .cta__inner p, .cta__btn",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: ".cta", start: "top 70%" },
        },
      );

      gsap.fromTo(
        ".cta__inner h2 .char",
        { yPercent: 120, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          stagger: 0.03,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: ".cta", start: "top 65%" },
        },
      );
    });

    return () => {
      scrubbers.forEach((s) => s.destroy());
      ctx.revert();
      gsap.ticker.remove(ticker);
      lenis.destroy();
      document.documentElement.classList.remove("lenis");
    };
  }, [ready]);
}
