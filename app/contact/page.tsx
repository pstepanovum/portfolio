"use client";

import { Container } from "@/components/container";
import ContactForm from "@/components/page/contact/contact-form-card";
import ResumeDownload from "@/components/page/contact/resume-download-card";
import { Suspense } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

const MessageSquareIcon = ({
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

export default function Contact() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Navbar />
      <main className="flex-1 bg-black text-white">
        <section
          className="relative min-h-[60vh] flex items-center py-32 overflow-hidden"
          style={{
            backgroundImage: 'url("/images/page/contact/hero.webp")',
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black" />

          <Container className="relative z-10 space-y-10">
            <div className="max-w-[64rem] space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/10 mb-4">
                <MessageSquareIcon className="w-4 h-4 text-white" />
                <span className="text-sm text-white/80">Get in Touch</span>
              </div>

              <h1 className="text-4xl tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-white">
                Let&apos;s Work Together
              </h1>

              <p className="text-xl md:text-2xl text-white/60 max-w-[42rem] leading-relaxed">
                Have a project in mind? Let&apos;s discuss how we can bring your
                ideas to life.
              </p>
            </div>
          </Container>
        </section>

        <section className="py-24 relative">
          <Container>
            <div className="flex flex-col gap-16 max-w-3xl mx-auto">
              <div>
                <div className="space-y-4 mb-8">
                  <h2 className="text-2xl md:text-3xl">Send a Message</h2>
                  <p className="text-white/60">
                    Fill out the form below and I&apos;ll get back to you as
                    soon as possible.
                  </p>
                </div>

                <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 md:p-8">
                  <ContactForm />
                </div>
              </div>

              <div>
                <div className="space-y-4 mb-8">
                  <h2 className="text-2xl md:text-3xl">Download Resume</h2>
                  <p className="text-white/60">
                    Access my detailed resume with password protection. Contact
                    me to get the password.
                  </p>
                </div>

                <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 md:p-8">
                  <ResumeDownload />
                </div>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </Suspense>
  );
}
