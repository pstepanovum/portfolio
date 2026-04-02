"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FormDataState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type FormState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

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
      d="M21.7075 12.2925C21.8005 12.3854 21.8742 12.4957 21.9246 12.6171C21.9749 12.7385 22.0008 12.8686 22.0008 13C22.0008 13.1314 21.9749 13.2615 21.9246 13.3829C21.8742 13.5043 21.8005 13.6146 21.7075 13.7075L14.7075 20.7075C14.6146 20.8005 14.5043 20.8742 14.3829 20.9246C14.2615 20.9749 14.1314 21.0008 14 21.0008C13.8686 21.0008 13.7385 20.9749 13.6171 20.9246C13.4957 20.8742 13.3854 20.8005 13.2925 20.7075L10.2925 17.7075C10.1049 17.5199 9.99945 17.2654 9.99945 17C9.99945 16.7346 10.1049 16.4801 10.2925 16.2925C10.4801 16.1049 10.7346 15.9994 11 15.9994C11.2654 15.9994 11.5199 16.1049 11.7075 16.2925L14 18.5863L20.2925 12.2925C20.3854 12.1995 20.4957 12.1258 20.6171 12.0754C20.7385 12.0251 20.8686 11.9992 21 11.9992C21.1314 11.9992 21.2615 12.0251 21.3829 12.0754C21.5043 12.1258 21.6146 12.1995 21.7075 12.2925ZM29 16C29 18.5712 28.2376 21.0846 26.8091 23.2224C25.3807 25.3603 23.3503 27.0265 20.9749 28.0104C18.5995 28.9944 15.9856 29.2518 13.4638 28.7502C10.9421 28.2486 8.6257 27.0105 6.80762 25.1924C4.98953 23.3743 3.75141 21.0579 3.2498 18.5362C2.74819 16.0144 3.00563 13.4006 3.98957 11.0251C4.97351 8.64968 6.63975 6.61935 8.77759 5.1909C10.9154 3.76244 13.4288 3 16 3C19.4467 3.00364 22.7512 4.37445 25.1884 6.81163C27.6256 9.24882 28.9964 12.5533 29 16Z"
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
    <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
    <path
      d="M16 10V16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16 22H16.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
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
      d="M17 4V8C17 8.26522 16.8946 8.51957 16.7071 8.70711C16.5196 8.89464 16.2652 9 16 9C15.7348 9 15.4804 8.89464 15.2929 8.70711C15.1054 8.51957 15 8.26522 15 8V4C15 3.73478 15.1054 3.48043 15.2929 3.29289C15.4804 3.10536 15.7348 3 16 3C16.2652 3 16.5196 3.10536 16.7071 3.29289C16.8946 3.48043 17 3.73478 17 4ZM28 15H24C23.7348 15 23.4804 15.1054 23.2929 15.2929C23.1054 15.4804 23 15.7348 23 16C23 16.2652 23.1054 16.5196 23.2929 16.7071C23.4804 16.8946 23.7348 17 24 17H28C28.2652 17 28.5196 16.8946 28.7071 16.7071C28.8946 16.5196 29 16.2652 29 16C29 15.7348 28.8946 15.4804 28.7071 15.2929C28.5196 15.1054 28.2652 15 28 15Z"
      fill="currentColor"
    />
  </svg>
);

export default function ContactForm() {
  const [formData, setFormData] = useState<FormDataState>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [formState, setFormState] = useState<FormState>({
    status: "idle",
    message: "",
  });

  const inputClasses =
    "w-full bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed";
  const labelClasses = "text-sm text-white/60";

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const closeDialog = () => {
    if (formState.status !== "submitting") {
      setFormState({ status: "idle", message: "" });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormState({ status: "submitting", message: "Sending your message..." });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        throw new Error(result?.error || "Unable to send message.");
      }

      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
      setFormState({
        status: "success",
        message: "Message sent successfully! I'll get back to you soon.",
      });
    } catch (error) {
      setFormState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Sorry, there was a problem sending your message. Please try again.",
      });
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        aria-label="Contact form"
        autoComplete="on"
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="name" className={labelClasses}>
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter your full name"
              autoComplete="name"
              required
              disabled={formState.status === "submitting"}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className={labelClasses}>
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className={inputClasses}
              placeholder="your@email.com"
              autoComplete="email"
              required
              disabled={formState.status === "submitting"}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="subject" className={labelClasses}>
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            value={formData.subject}
            onChange={handleChange}
            className={inputClasses}
            placeholder="What would you like to discuss?"
            required
            disabled={formState.status === "submitting"}
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
            className={`${inputClasses} min-h-40 resize-y`}
            placeholder="Share a few details about your project or idea..."
            required
            disabled={formState.status === "submitting"}
          />
        </div>

        <button
          type="submit"
          className="w-full px-6 py-4 bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          disabled={formState.status === "submitting"}
        >
          {formState.status === "submitting" ? (
            <>
              <LoaderIcon className="w-5 h-5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <SendIcon className="w-5 h-5" />
              Send Message
            </>
          )}
        </button>
      </form>

      <Dialog
        open={formState.status === "success" || formState.status === "error"}
        onOpenChange={closeDialog}
      >
        <DialogContent className="border-white/10 bg-black text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formState.status === "success" ? (
                <CheckCircleIcon className="w-5 h-5 text-green-400" />
              ) : (
                <AlertCircleIcon className="w-5 h-5 text-red-400" />
              )}
              {formState.status === "success" ? "Message Sent" : "Message Failed"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/70">{formState.message}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
