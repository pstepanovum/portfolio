"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// --- CUSTOM SVG ICONS ---
// Replace the d="" paths with your own SVG data

const SendIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M29.6098 3.27376C29.4549 3.13997 29.2664 3.051 29.0646 3.01641C28.8629 2.98183 28.6555 3.00296 28.4648 3.07751L3.13233 12.9913C2.77331 13.1309 2.46936 13.3833 2.26623 13.7106C2.06311 14.0379 1.97181 14.4224 2.00607 14.806C2.04034 15.1897 2.19831 15.5519 2.45622 15.838C2.71413 16.1241 3.058 16.3187 3.43608 16.3925L9.99983 17.6813V25C9.99854 25.3987 10.117 25.7885 10.3399 26.119C10.5628 26.4496 10.8798 26.7055 11.2498 26.8538C11.6193 27.0046 12.0257 27.0409 12.416 26.9577C12.8064 26.8746 13.1627 26.6759 13.4386 26.3875L16.6036 23.105L21.6248 27.5C21.9871 27.8213 22.4543 27.9992 22.9386 28C23.1508 27.9998 23.3617 27.9665 23.5636 27.9013C23.8935 27.7966 24.1903 27.6073 24.4243 27.3522C24.6583 27.0971 24.8214 26.7852 24.8973 26.4475L29.9711 4.37501C30.0165 4.17595 30.0068 3.96829 29.9432 3.77429C29.8795 3.58029 29.7643 3.40727 29.6098 3.27376ZM21.9673 7.77376L10.7686 15.7938L4.56858 14.5775L21.9673 7.77376ZM11.9998 25V19.065L15.0986 21.7825L11.9998 25ZM22.9411 26L12.6061 16.9375L27.4811 6.27626L22.9411 26Z"
      fill="currentColor"
    />
  </svg>
);

const CheckCircleIcon = ({
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
      d="M21.7075 12.2925C21.8005 12.3854 21.8742 12.4957 21.9246 12.6171C21.9749 12.7385 22.0008 12.8686 22.0008 13C22.0008 13.1314 21.9749 13.2615 21.9246 13.3829C21.8742 13.5043 21.8005 13.6146 21.7075 13.7075L14.7075 20.7075C14.6146 20.8005 14.5043 20.8742 14.3829 20.9246C14.2615 20.9749 14.1314 21.0008 14 21.0008C13.8686 21.0008 13.7385 20.9749 13.6171 20.9246C13.4957 20.8742 13.3854 20.8005 13.2925 20.7075L10.2925 17.7075C10.1049 17.5199 9.99945 17.2654 9.99945 17C9.99945 16.7346 10.1049 16.4801 10.2925 16.2925C10.4801 16.1049 10.7346 15.9994 11 15.9994C11.2654 15.9994 11.5199 16.1049 11.7075 16.2925L14 18.5863L20.2925 12.2925C20.3854 12.1995 20.4957 12.1258 20.6171 12.0754C20.7385 12.0251 20.8686 11.9992 21 11.9992C21.1314 11.9992 21.2615 12.0251 21.3829 12.0754C21.5043 12.1258 21.6146 12.1995 21.7075 12.2925ZM29 16C29 18.5712 28.2376 21.0846 26.8091 23.2224C25.3807 25.3603 23.3503 27.0265 20.9749 28.0104C18.5995 28.9944 15.9856 29.2518 13.4638 28.7502C10.9421 28.2486 8.6257 27.0105 6.80762 25.1924C4.98953 23.3743 3.75141 21.0579 3.2498 18.5362C2.74819 16.0144 3.00563 13.4006 3.98957 11.0251C4.97351 8.64968 6.63975 6.61935 8.77759 5.1909C10.9154 3.76244 13.4288 3 16 3C19.4467 3.00364 22.7512 4.37445 25.1884 6.81163C27.6256 9.24882 28.9964 12.5533 29 16ZM27 16C27 13.8244 26.3549 11.6977 25.1462 9.88873C23.9375 8.07979 22.2195 6.66989 20.2095 5.83733C18.1995 5.00476 15.9878 4.78692 13.854 5.21136C11.7202 5.6358 9.76021 6.68345 8.22183 8.22183C6.68345 9.7602 5.63581 11.7202 5.21137 13.854C4.78693 15.9878 5.00477 18.1995 5.83733 20.2095C6.66989 22.2195 8.07979 23.9375 9.88873 25.1462C11.6977 26.3549 13.8244 27 16 27C18.9164 26.9967 21.7123 25.8367 23.7745 23.7745C25.8367 21.7123 26.9967 18.9164 27 16Z"
      fill="currentColor"
    />
  </svg>
);

const AlertCircleIcon = ({
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
      d="M26 5H6C5.46957 5 4.96086 5.21071 4.58579 5.58579C4.21071 5.96086 4 6.46957 4 7V14.3462C4 25.5487 13.4775 29.2638 15.375 29.8937C15.7801 30.0324 16.2199 30.0324 16.625 29.8937C18.525 29.2625 28 25.5475 28 14.345V7C28 6.46957 27.7893 5.96086 27.4142 5.58579C27.0391 5.21071 26.5304 5 26 5ZM26 14.3488C26 24.1512 17.7075 27.4263 16 27.9963C14.3088 27.4338 6 24.1613 6 14.3488V7H26V14.3488ZM15 17V12C15 11.7348 15.1054 11.4804 15.2929 11.2929C15.4804 11.1054 15.7348 11 16 11C16.2652 11 16.5196 11.1054 16.7071 11.2929C16.8946 11.4804 17 11.7348 17 12V17C17 17.2652 16.8946 17.5196 16.7071 17.7071C16.5196 17.8946 16.2652 18 16 18C15.7348 18 15.4804 17.8946 15.2929 17.7071C15.1054 17.5196 15 17.2652 15 17ZM14.5 21.5C14.5 21.2033 14.588 20.9133 14.7528 20.6666C14.9176 20.42 15.1519 20.2277 15.426 20.1142C15.7001 20.0007 16.0017 19.9709 16.2926 20.0288C16.5836 20.0867 16.8509 20.2296 17.0607 20.4393C17.2704 20.6491 17.4133 20.9164 17.4712 21.2074C17.5291 21.4983 17.4993 21.7999 17.3858 22.074C17.2723 22.3481 17.08 22.5824 16.8334 22.7472C16.5867 22.912 16.2967 23 16 23C15.6022 23 15.2206 22.842 14.9393 22.5607C14.658 22.2794 14.5 21.8978 14.5 21.5Z"
      fill="curentColor"
    />
  </svg>
);

const LoaderIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M17 4V8C17 8.26522 16.8946 8.51957 16.7071 8.70711C16.5196 8.89464 16.2652 9 16 9C15.7348 9 15.4804 8.89464 15.2929 8.70711C15.1054 8.51957 15 8.26522 15 8V4C15 3.73478 15.1054 3.48043 15.2929 3.29289C15.4804 3.10536 15.7348 3 16 3C16.2652 3 16.5196 3.10536 16.7071 3.29289C16.8946 3.48043 17 3.73478 17 4ZM28 15H24C23.7348 15 23.4804 15.1054 23.2929 15.2929C23.1054 15.4804 23 15.7348 23 16C23 16.2652 23.1054 16.5196 23.2929 16.7071C23.4804 16.8946 23.7348 17 24 17H28C28.2652 17 28.5196 16.8946 28.7071 16.7071C28.8946 16.5196 29 16.2652 29 16C29 15.7348 28.8946 15.4804 28.7071 15.2929C28.5196 15.1054 28.2652 15 28 15ZM22.3638 20.95C22.1747 20.7704 21.9229 20.6717 21.6622 20.6751C21.4014 20.6784 21.1523 20.7835 20.9679 20.9679C20.7835 21.1523 20.6784 21.4014 20.6751 21.6622C20.6717 21.9229 20.7704 22.1747 20.95 22.3638L23.7775 25.1925C23.9651 25.3801 24.2196 25.4856 24.485 25.4856C24.7504 25.4856 25.0049 25.3801 25.1925 25.1925C25.3801 25.0049 25.4856 24.7504 25.4856 24.485C25.4856 24.2196 25.3801 23.9651 25.1925 23.7775L22.3638 20.95ZM16 23C15.7348 23 15.4804 23.1054 15.2929 23.2929C15.1054 23.4804 15 23.7348 15 24V28C15 28.2652 15.1054 28.5196 15.2929 28.7071C15.4804 28.8946 15.7348 29 16 29C16.2652 29 16.5196 28.8946 16.7071 28.7071C16.8946 28.5196 17 28.2652 17 28V24C17 23.7348 16.8946 23.4804 16.7071 23.2929C16.5196 23.1054 16.2652 23 16 23ZM9.63625 20.95L6.8075 23.7775C6.61986 23.9651 6.51444 24.2196 6.51444 24.485C6.51444 24.7504 6.61986 25.0049 6.8075 25.1925C6.99514 25.3801 7.24964 25.4856 7.515 25.4856C7.78036 25.4856 8.03486 25.3801 8.2225 25.1925L11.05 22.3638C11.2296 22.1747 11.3283 21.9229 11.3249 21.6622C11.3216 21.4014 11.2165 21.1523 11.0321 20.9679C10.8477 20.7835 10.5986 20.6784 10.3378 20.6751C10.0771 20.6717 9.82531 20.7704 9.63625 20.95ZM9 16C9 15.7348 8.89464 15.4804 8.70711 15.2929C8.51957 15.1054 8.26522 15 8 15H4C3.73478 15 3.48043 15.1054 3.29289 15.2929C3.10536 15.4804 3 15.7348 3 16C3 16.2652 3.10536 16.5196 3.29289 16.7071C3.48043 16.8946 3.73478 17 4 17H8C8.26522 17 8.51957 16.8946 8.70711 16.7071C8.89464 16.5196 9 16.2652 9 16ZM8.2225 6.8075C8.03486 6.61986 7.78036 6.51444 7.515 6.51444C7.24964 6.51444 6.99514 6.61986 6.8075 6.8075C6.61986 6.99514 6.51444 7.24964 6.51444 7.515C6.51444 7.78036 6.61986 8.03486 6.8075 8.2225L9.63625 11.05C9.82531 11.2296 10.0771 11.3283 10.3378 11.3249C10.5986 11.3216 10.8477 11.2165 11.0321 11.0321C11.2165 10.8477 11.3216 10.5986 11.3249 10.3378C11.3283 10.0771 11.2296 9.82531 11.05 9.63625L8.2225 6.8075Z"
      fill="curentColor"
    />
  </svg>
);

// -----------------------

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormState {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
}

const ContactForm = () => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [formState, setFormState] = useState<FormState>({
    status: "idle",
    message: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      subject: "",
      message: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState({ status: "submitting", message: "Sending your message..." });

    try {
      const response = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          "form-name": "contact",
          ...formData,
        }).toString(),
      });

      if (response.ok) {
        setFormState({
          status: "success",
          message: "Message sent successfully! I'll get back to you soon.",
        });
        resetForm();
      } else {
        throw new Error("Network response was not ok");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setFormState({
        status: "error",
        message:
          "Sorry, there was a problem sending your message. Please try again.",
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const closeDialog = () => {
    if (formState.status === "success" || formState.status === "error") {
      setFormState({ status: "idle", message: "" });
    }
  };

  const inputClasses = `
    w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 
    text-white placeholder:text-white/40 focus:outline-none 
    focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const labelClasses = "text-sm text-white/60";

  return (
    <>
      <form
        name="contact"
        method="POST"
        data-netlify="true"
        data-netlify-honeypot="bot-field"
        onSubmit={handleSubmit}
        className="space-y-6"
        encType="application/x-www-form-urlencoded"
        action="/contact"
        aria-label="Contact form"
        autoComplete="on"
      >
        <input type="hidden" name="form-name" value="contact" />
        <div hidden>
          <input name="bot-field" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="name" className={labelClasses}>
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter your full name"
              required
              disabled={formState.status === "submitting"}
              autoComplete="name"
              autoCapitalize="words"
              spellCheck="false"
              aria-required="true"
              aria-label="Full name"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className={labelClasses}>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={inputClasses}
              placeholder="your@email.com"
              required
              disabled={formState.status === "submitting"}
              autoComplete="email"
              spellCheck="false"
              aria-required="true"
              aria-label="Email address"
              inputMode="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="subject" className={labelClasses}>
            Subject
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className={inputClasses}
            placeholder="What's this about?"
            required
            disabled={formState.status === "submitting"}
            autoComplete="off"
            aria-required="true"
            aria-label="Subject of the message"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="message" className={labelClasses}>
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={6}
            className={`${inputClasses} resize-none`}
            placeholder="Tell me about your project..."
            required
            disabled={formState.status === "submitting"}
            spellCheck="true"
            aria-required="true"
            aria-label="Your message"
          />
        </div>

        <button
          type="submit"
          disabled={formState.status === "submitting"}
          className={`
            w-full px-8 py-4 bg-white text-black rounded-xl 
            hover:bg-white/90 transition-all duration-300 
            flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          aria-label={
            formState.status === "submitting"
              ? "Sending message..."
              : "Send message"
          }
        >
          {formState.status === "submitting" ? (
            <>
              <LoaderIcon className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <SendIcon className="w-5 h-5" aria-hidden="true" />
              <span>Send Message</span>
            </>
          )}
        </button>
      </form>

      <Dialog
        open={formState.status === "success" || formState.status === "error"}
        onOpenChange={closeDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formState.status === "success" ? (
                <>
                  <CheckCircleIcon
                    className="w-5 h-5 text-green-500"
                    aria-hidden="true"
                  />
                  <span>Message Sent</span>
                </>
              ) : formState.status === "error" ? (
                <>
                  <AlertCircleIcon
                    className="w-5 h-5 text-red-500"
                    aria-hidden="true"
                  />
                  <span>Error</span>
                </>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/80">{formState.message}</p>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactForm;
