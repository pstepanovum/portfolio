"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { encode as base64Encode } from "base-64";

// --- CUSTOM SVG ICONS ---
// Replace the d="" paths with your own SVG data

const LockIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M16 14C15.1595 14.0003 14.3472 14.303 13.7115 14.8529C13.0758 15.4027 12.6592 16.163 12.5378 16.9947C12.4165 17.8264 12.5985 18.674 13.0506 19.3825C13.5027 20.0911 14.1946 20.6133 15 20.8538V23C15 23.2652 15.1054 23.5196 15.2929 23.7071C15.4804 23.8946 15.7348 24 16 24C16.2652 24 16.5196 23.8946 16.7071 23.7071C16.8946 23.5196 17 23.2652 17 23V20.8538C17.8054 20.6133 18.4973 20.0911 18.9494 19.3825C19.4015 18.674 19.5835 17.8264 19.4622 16.9947C19.3408 16.163 18.9242 15.4027 18.2885 14.8529C17.6528 14.303 16.8405 14.0003 16 14ZM16 19C15.7033 19 15.4133 18.912 15.1666 18.7472C14.92 18.5824 14.7277 18.3481 14.6142 18.074C14.5006 17.7999 14.4709 17.4983 14.5288 17.2074C14.5867 16.9164 14.7296 16.6491 14.9393 16.4393C15.1491 16.2296 15.4164 16.0867 15.7074 16.0288C15.9983 15.9709 16.2999 16.0007 16.574 16.1142C16.8481 16.2277 17.0824 16.42 17.2472 16.6666C17.412 16.9133 17.5 17.2033 17.5 17.5C17.5 17.8978 17.342 18.2794 17.0607 18.5607C16.7794 18.842 16.3978 19 16 19ZM26 10H22V7C22 5.4087 21.3679 3.88258 20.2426 2.75736C19.1174 1.63214 17.5913 1 16 1C14.4087 1 12.8826 1.63214 11.7574 2.75736C10.6321 3.88258 10 5.4087 10 7V10H6C5.46957 10 4.96086 10.2107 4.58579 10.5858C4.21071 10.9609 4 11.4696 4 12V26C4 26.5304 4.21071 27.0391 4.58579 27.4142C4.96086 27.7893 5.46957 28 6 28H26C26.5304 28 27.0391 27.7893 27.4142 27.4142C27.7893 27.0391 28 26.5304 28 26V12C28 11.4696 27.7893 10.9609 27.4142 10.5858C27.0391 10.2107 26.5304 10 26 10ZM12 7C12 5.93913 12.4214 4.92172 13.1716 4.17157C13.9217 3.42143 14.9391 3 16 3C17.0609 3 18.0783 3.42143 18.8284 4.17157C19.5786 4.92172 20 5.93913 20 7V10H12V7ZM26 26H6V12H26V26Z"
      fill="currentColor"
    />
  </svg>
);

const FileTextIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M26.7075 10.2925L19.7075 3.2925C19.6146 3.19967 19.5042 3.12605 19.3829 3.07586C19.2615 3.02568 19.1314 2.9999 19 3H7C6.46957 3 5.96086 3.21071 5.58579 3.58579C5.21071 3.96086 5 4.46957 5 5V27C5 27.5304 5.21071 28.0391 5.58579 28.4142C5.96086 28.7893 6.46957 29 7 29H25C25.5304 29 26.0391 28.7893 26.4142 28.4142C26.7893 28.0391 27 27.5304 27 27V11C27.0001 10.8686 26.9743 10.7385 26.9241 10.6172C26.8739 10.4958 26.8003 10.3854 26.7075 10.2925ZM20 6.41375L23.5863 10H20V6.41375ZM25 27H7V5H18V11C18 11.2652 18.1054 11.5196 18.2929 11.7071C18.4804 11.8946 18.7348 12 19 12H25V27Z"
      fill="currentColor"
    />
  </svg>
);

const EyeIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M26.7075 10.2925L19.7075 3.2925C19.6146 3.19967 19.5042 3.12605 19.3829 3.07586C19.2615 3.02568 19.1314 2.9999 19 3H7C6.46957 3 5.96086 3.21071 5.58579 3.58579C5.21071 3.96086 5 4.46957 5 5V27C5 27.5304 5.21071 28.0391 5.58579 28.4142C5.96086 28.7893 6.46957 29 7 29H25C25.5304 29 26.0391 28.7893 26.4142 28.4142C26.7893 28.0391 27 27.5304 27 27V11C27.0001 10.8686 26.9743 10.7385 26.9241 10.6172C26.8739 10.4958 26.8003 10.3854 26.7075 10.2925ZM20 6.41375L23.5863 10H20V6.41375ZM25 27H7V5H18V11C18 11.2652 18.1054 11.5196 18.2929 11.7071C18.4804 11.8946 18.7348 12 19 12H25V27Z"
      fill="currentColor"
    />
  </svg>
);

const EyeOffIcon = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M28.4999 21.875C28.3857 21.9401 28.2598 21.9821 28.1293 21.9985C27.9989 22.0149 27.8665 22.0054 27.7397 21.9706C27.6129 21.9358 27.4942 21.8763 27.3904 21.7955C27.2867 21.7148 27.1999 21.6143 27.1349 21.5L24.7599 17.35C23.3792 18.2836 21.856 18.9869 20.2499 19.4325L20.9837 23.835C21.0053 23.9646 21.0012 24.0972 20.9716 24.2252C20.942 24.3532 20.8874 24.4742 20.811 24.5811C20.7346 24.688 20.6379 24.7788 20.5264 24.8483C20.4149 24.9179 20.2908 24.9647 20.1612 24.9863C20.1079 24.995 20.054 24.9996 19.9999 25C19.7634 24.9996 19.5346 24.9154 19.3542 24.7623C19.1739 24.6092 19.0537 24.3971 19.0149 24.1638L18.2937 19.8413C16.7727 20.0529 15.2297 20.0529 13.7087 19.8413L12.9874 24.1638C12.9486 24.3976 12.828 24.61 12.6472 24.7631C12.4663 24.9163 12.2369 25.0002 11.9999 25C11.9447 24.9998 11.8895 24.9952 11.8349 24.9863C11.7053 24.9647 11.5812 24.9179 11.4697 24.8483C11.3582 24.7788 11.2615 24.688 11.1851 24.5811C11.1087 24.4742 11.0541 24.3532 11.0245 24.2252C10.9949 24.0972 10.9908 23.9646 11.0124 23.835L11.7499 19.4325C10.1445 18.9855 8.62219 18.2809 7.24244 17.3463L4.87494 21.5C4.74233 21.7311 4.52336 21.9 4.2662 21.9696C4.00904 22.0392 3.73476 22.0039 3.50369 21.8713C3.27262 21.7386 3.10369 21.5197 3.03407 21.2625C2.96444 21.0054 2.99983 20.7311 3.13244 20.5L5.63244 16.125C4.75431 15.3664 3.94683 14.5296 3.21994 13.625C3.12928 13.5238 3.06021 13.4052 3.01693 13.2764C2.97365 13.1476 2.95707 13.0113 2.96821 12.8759C2.97934 12.7405 3.01796 12.6087 3.0817 12.4887C3.14544 12.3687 3.23296 12.263 3.33893 12.1779C3.4449 12.0929 3.56708 12.0303 3.69803 11.9941C3.82898 11.9578 3.96595 11.9486 4.10056 11.9671C4.23518 11.9855 4.36463 12.0312 4.48101 12.1013C4.59738 12.1715 4.69824 12.2646 4.77744 12.375C6.85244 14.9425 10.4824 18 15.9999 18C21.5174 18 25.1474 14.9388 27.2224 12.375C27.3007 12.2623 27.4014 12.167 27.5181 12.0949C27.6348 12.0228 27.7651 11.9754 27.9009 11.9559C28.0367 11.9363 28.1751 11.9448 28.3074 11.981C28.4398 12.0172 28.5632 12.0803 28.6702 12.1662C28.7771 12.2522 28.8652 12.3592 28.929 12.4807C28.9928 12.6022 29.0309 12.7355 29.041 12.8723C29.051 13.0091 29.0328 13.1466 28.9875 13.2761C28.9421 13.4055 28.8706 13.5243 28.7774 13.625C28.0505 14.5296 27.2431 15.3664 26.3649 16.125L28.8649 20.5C28.932 20.614 28.9759 20.7403 28.9938 20.8714C29.0118 21.0025 29.0036 21.1358 28.9696 21.2637C28.9357 21.3916 28.8767 21.5115 28.796 21.6164C28.7154 21.7214 28.6148 21.8093 28.4999 21.875Z"
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
      d="M28.2325 12.8525C27.7612 12.36 27.2738 11.8525 27.09 11.4062C26.92 10.9975 26.91 10.32 26.9 9.66375C26.8813 8.44375 26.8612 7.06125 25.9 6.1C24.9387 5.13875 23.5562 5.11875 22.3363 5.1C21.68 5.09 21.0025 5.08 20.5938 4.91C20.1488 4.72625 19.64 4.23875 19.1475 3.7675C18.285 2.93875 17.305 2 16 2C14.695 2 13.7162 2.93875 12.8525 3.7675C12.36 4.23875 11.8525 4.72625 11.4062 4.91C11 5.08 10.32 5.09 9.66375 5.1C8.44375 5.11875 7.06125 5.13875 6.1 6.1C5.13875 7.06125 5.125 8.44375 5.1 9.66375C5.09 10.32 5.08 10.9975 4.91 11.4062C4.72625 11.8512 4.23875 12.36 3.7675 12.8525C2.93875 13.715 2 14.695 2 16C2 17.305 2.93875 18.2837 3.7675 19.1475C4.23875 19.64 4.72625 20.1475 4.91 20.5938C5.08 21.0025 5.09 21.68 5.1 22.3363C5.11875 23.5562 5.13875 24.9387 6.1 25.9C7.06125 26.8612 8.44375 26.8813 9.66375 26.9C10.32 26.91 10.9975 26.92 11.4062 27.09C11.8512 27.2738 12.36 27.7612 12.8525 28.2325C13.715 29.0613 14.695 30 16 30C17.305 30 18.2837 29.0613 19.1475 28.2325C19.64 27.7612 20.1475 27.2738 20.5938 27.09C21.0025 26.92 21.68 26.91 22.3363 26.9C23.5562 26.8813 24.9387 26.8612 25.9 25.9C26.8612 24.9387 26.8813 23.5562 26.9 22.3363C26.91 21.68 26.92 21.0025 27.09 20.5938C27.2738 20.1488 27.7612 19.64 28.2325 19.1475C29.0613 18.285 30 17.305 30 16C30 14.695 29.0613 13.7162 28.2325 12.8525ZM26.7887 17.7638C26.19 18.3888 25.57 19.035 25.2412 19.8288C24.9262 20.5913 24.9125 21.4625 24.9 22.3062C24.8875 23.1812 24.8738 24.0975 24.485 24.485C24.0963 24.8725 23.1862 24.8875 22.3062 24.9C21.4625 24.9125 20.5913 24.9262 19.8288 25.2412C19.035 25.57 18.3888 26.19 17.7638 26.7887C17.1388 27.3875 16.5 28 16 28C15.5 28 14.8562 27.385 14.2362 26.7887C13.6163 26.1925 12.965 25.57 12.1713 25.2412C11.4088 24.9262 10.5375 24.9125 9.69375 24.9C8.81875 24.8875 7.9025 24.8738 7.515 24.485C7.1275 24.0963 7.1125 23.1862 7.1 22.3062C7.0875 21.4625 7.07375 20.5913 6.75875 19.8288C6.43 19.035 5.81 18.3888 5.21125 17.7638C4.6125 17.1388 4 16.5 4 16C4 15.5 4.615 14.8562 5.21125 14.2362C5.8075 13.6163 6.43 12.965 6.75875 12.1713C7.07375 11.4088 7.0875 10.5375 7.1 9.69375C7.1125 8.81875 7.12625 7.9025 7.515 7.515C7.90375 7.1275 8.81375 7.1125 9.69375 7.1C10.5375 7.0875 11.4088 7.07375 12.1713 6.75875C12.965 6.43 13.6112 5.81 14.2362 5.21125C14.8612 4.6125 15.5 4 16 4C16.5 4 17.1438 4.615 17.7638 5.21125C18.3838 5.8075 19.035 6.43 19.8288 6.75875C20.5913 7.07375 21.4625 7.0875 22.3062 7.1C23.1812 7.1125 24.0975 7.12625 24.485 7.515C24.8725 7.90375 24.8875 8.81375 24.9 9.69375C24.9125 10.5375 24.9262 11.4088 25.2412 12.1713C25.57 12.965 26.19 13.6112 26.7887 14.2362C27.3875 14.8612 28 15.5 28 16C28 16.5 27.385 17.1438 26.7887 17.7638ZM21.7075 12.2925C21.8005 12.3854 21.8742 12.4957 21.9246 12.6171C21.9749 12.7385 22.0008 12.8686 22.0008 13C22.0008 13.1314 21.9749 13.2615 21.9246 13.3829C21.8742 13.5043 21.8005 13.6146 21.7075 13.7075L14.7075 20.7075C14.6146 20.8005 14.5043 20.8742 14.3829 20.9246C14.2615 20.9749 14.1314 21.0008 14 21.0008C13.8686 21.0008 13.7385 20.9749 13.6171 20.9246C13.4957 20.8742 13.3854 20.8005 13.2925 20.7075L10.2925 17.7075C10.1049 17.5199 9.99944 17.2654 9.99944 17C9.99944 16.7346 10.1049 16.4801 10.2925 16.2925C10.4801 16.1049 10.7346 15.9994 11 15.9994C11.2654 15.9994 11.5199 16.1049 11.7075 16.2925L14 18.5863L20.2925 12.2925C20.3854 12.1995 20.4957 12.1258 20.6171 12.0754C20.7385 12.0251 20.8686 11.9992 21 11.9992C21.1314 11.9992 21.2615 12.0251 21.3829 12.0754C21.5043 12.1258 21.6146 12.1995 21.7075 12.2925Z"
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
    {/* PASTE ALERT CIRCLE ICON PATH HERE */}
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

// -----------------------

interface DownloadState {
  status: "idle" | "loading" | "success" | "error";
  message: string;
}

const ResumeDownload = () => {
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [downloadState, setDownloadState] = useState<DownloadState>({
    status: "idle",
    message: "",
  });
  const [attempts, setAttempts] = useState<number>(0);
  const MAX_ATTEMPTS = 3;
  const COOLDOWN_TIME = 30000; // 30 seconds

  const handlePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const resetForm = () => {
    setPassword("");
    setShowPassword(false);
    setDownloadState({ status: "idle", message: "" });
  };

  const isLocked = attempts >= MAX_ATTEMPTS;

  const handleDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (isLocked) {
      setDownloadState({
        status: "error",
        message: `Too many attempts. Please try again in ${Math.ceil(
          COOLDOWN_TIME / 1000
        )} seconds.`,
      });
      return;
    }

    setDownloadState({ status: "loading", message: "Verifying password..." });

    try {
      // Simple delay to prevent brute force
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Compare with encoded password to add a minimal layer of obscurity
      const encodedPassword = base64Encode(password.trim());
      const encodedCorrectPassword = base64Encode(
        process.env.NEXT_PUBLIC_RESUME_PASSWORD || ""
      );

      if (encodedPassword === encodedCorrectPassword) {
        setDownloadState({
          status: "success",
          message: "Password correct! Opening resume...",
        });

        setTimeout(() => {
          try {
            // Use a more complex filename to make it harder to guess
            const pdfWindow = window.open("/", "_blank");
            if (!pdfWindow) {
              setDownloadState({
                status: "error",
                message: "Please allow pop-ups to open the resume.",
              });
            } else {
              resetForm();
              setAttempts(0);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (error) {
            setDownloadState({
              status: "error",
              message: "Error opening the resume. Please try again.",
            });
          }
        }, 1500);
      } else {
        const remainingAttempts = MAX_ATTEMPTS - (attempts + 1);
        setAttempts((prev) => prev + 1);

        setDownloadState({
          status: "error",
          message:
            remainingAttempts > 0
              ? `Incorrect password. ${remainingAttempts} attempts remaining.`
              : "Maximum attempts reached. Please try again later.",
        });

        if (remainingAttempts === 0) {
          setTimeout(() => {
            setAttempts(0);
            setDownloadState({ status: "idle", message: "" });
          }, COOLDOWN_TIME);
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setDownloadState({
        status: "error",
        message: "An error occurred. Please try again.",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLocked) {
      const button = document.querySelector(
        'button[type="submit"]'
      ) as HTMLButtonElement;
      if (button) button.click();
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="resume-password" className="text-sm text-white/60">
            Enter Password
          </label>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="resume-password"
              name="resume-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (downloadState.status === "error") {
                  setDownloadState({ status: "idle", message: "" });
                }
              }}
              onKeyPress={handleKeyPress}
              className={`
                w-full bg-white/5 border border-white/10 
                px-4 py-3 pr-20 text-white placeholder:text-white/40 
                focus:outline-none focus:ring-2 focus:ring-white/20
                disabled:opacity-50 disabled:cursor-not-allowed
                ${downloadState.status === "error" ? "border-red-400/50" : ""}
              `}
              placeholder="Enter password to download"
              disabled={downloadState.status === "loading" || isLocked}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              autoFocus={false}
              inputMode="text"
              aria-label="Password for resume download"
              aria-invalid={downloadState.status === "error"}
              aria-describedby={
                downloadState.status === "error" ? "password-error" : undefined
              }
              data-lpignore="true"
              data-form-type="other"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="button"
                onClick={handlePasswordVisibility}
                className="p-1 hover:bg-white/10 transition-colors"
                disabled={downloadState.status === "loading" || isLocked}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={0}
              >
                {showPassword ? (
                  <EyeOffIcon
                    className="w-4 h-4 text-white/40"
                    aria-hidden="true"
                  />
                ) : (
                  <EyeIcon
                    className="w-4 h-4 text-white/40"
                    aria-hidden="true"
                  />
                )}
              </button>
              <LockIcon className="w-4 h-4 text-white/40" aria-hidden="true" />
            </div>
          </div>

          {downloadState.status === "error" && (
            <p
              id="password-error"
              className="text-red-400 text-sm flex items-center gap-1.5"
              role="alert"
            >
              <AlertCircleIcon className="w-4 h-4" aria-hidden="true" />
              {downloadState.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          onClick={handleDownload}
          disabled={!password || downloadState.status === "loading" || isLocked}
          className={`
            w-full px-8 py-4 bg-white/10 text-white
            hover:bg-white/20 transition-all duration-300 
            flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${downloadState.status === "loading" ? "animate-pulse" : ""}
          `}
          aria-disabled={
            !password || downloadState.status === "loading" || isLocked
          }
          aria-label={
            downloadState.status === "loading"
              ? "Verifying password..."
              : "Download resume"
          }
        >
          {downloadState.status === "loading" ? (
            <>
              <LoaderIcon className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <FileTextIcon className="w-5 h-5" aria-hidden="true" />
              <span>Download Resume</span>
            </>
          )}
        </button>
      </div>

      <Dialog
        open={downloadState.status === "success"}
        onOpenChange={() => {
          if (downloadState.status === "success") {
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircleIcon
                className="w-5 h-5 text-green-500"
                aria-hidden="true"
              />
              <span>Success</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/80">{downloadState.message}</p>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ResumeDownload;
