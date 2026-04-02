"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/navbar";
import { Container } from "@/components/container";
import Footer from "@/components/footer";
import { AnimatedExternalLink } from "@/components/ui/animated-link";

const ArrowRightIcon = ({
  className,
  ...props
}: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M27.7075 16.7076L18.7075 25.7076C18.5199 25.8952 18.2654 26.0006 18 26.0006C17.7346 26.0006 17.4801 25.8952 17.2925 25.7076C17.1049 25.5199 16.9994 25.2654 16.9994 25.0001C16.9994 24.7347 17.1049 24.4802 17.2925 24.2926L24.5863 17.0001H5C4.73478 17.0001 4.48043 16.8947 4.29289 16.7072C4.10536 16.5196 4 16.2653 4 16.0001C4 15.7349 4.10536 15.4805 4.29289 15.293C4.48043 15.1054 4.73478 15.0001 5 15.0001H24.5863L17.2925 7.70757C17.1049 7.51993 16.9994 7.26543 16.9994 7.00007C16.9994 6.7347 17.1049 6.48021 17.2925 6.29257C17.4801 6.10493 17.7346 5.99951 18 5.99951C18.2654 5.99951 18.5199 6.10493 18.7075 6.29257L27.7075 15.2926C27.8005 15.3854 27.8742 15.4957 27.9246 15.6171C27.9749 15.7385 28.0008 15.8687 28.0008 16.0001C28.0008 16.1315 27.9749 16.2616 27.9246 16.383C27.8742 16.5044 27.8005 16.6147 27.7075 16.7076Z"
      fill="currentColor"
    />
  </svg>
);

const Hero = () => {
  return (
    <section
      className="relative min-h-screen flex items-center py-32 overflow-hidden"
      style={{
        backgroundImage: 'url("/images/page/index/hero.webp")',
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black" />

      <Container className="relative z-10 space-y-10">
        <div className="max-w-[64rem] space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2"
          >
            <div className="w-2 h-2 bg-green-500 animate-pulse" />
            <span className="text-sm text-white/80">Available for work</span>
          </motion.div>

          <h1 className="text-4xl tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Hi, I&apos;m Pavel Stepanov
          </h1>
          <p className="text-xl md:text-2xl text-white/60 max-w-[42rem] leading-relaxed">
            Full Stack Developer and AI Engineer specializing in Machine
            Learning and Cybersecurity. Building innovative solutions for
            tomorrow&apos;s challenges.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              href="/projects"
              className="px-8 py-4 bg-white text-black hover:bg-white/90 transition-colors text-center"
            >
              View Projects
            </Link>
            <Link
              href="/contact"
              className="group px-8 py-4 bg-white/10 text-white hover:bg-white/20 transition-colors inline-flex items-center justify-center"
            >
              Contact Me
              <ArrowRightIcon className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="flex items-center gap-6 pt-8">
            <AnimatedExternalLink
              href="https://github.com/pstepanovum"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors"
            >
              GITHUB
            </AnimatedExternalLink>
            <AnimatedExternalLink
              href="https://www.linkedin.com/in/hirepavelstepanov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors"
            >
              LINKEDIN
            </AnimatedExternalLink>
            <AnimatedExternalLink
              href="mailto:contact@pstepanov.work"
              className="text-white/60 hover:text-white transition-colors"
            >
              EMAIL
            </AnimatedExternalLink>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default function HomePageClient() {
  return (
    <>
      <Navbar />
      <div className="flex-1 flex flex-col bg-background text-foreground theme-transition">
        <Hero />
      </div>
      <Footer />
    </>
  );
}
