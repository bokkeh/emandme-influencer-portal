import { SignIn } from "@clerk/nextjs";

const clerkAppearance = {
  variables: {
    colorPrimary: "#e11d48",
    colorText: "#111827",
    colorBackground: "#ffffff",
    colorInputBackground: "#f9fafb",
    colorInputText: "#111827",
    borderRadius: "0.5rem",
    fontFamily: "inherit",
  },
  elements: {
    card: "shadow-none border border-gray-200",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton: "border border-gray-200 hover:bg-gray-50",
    formButtonPrimary: "bg-rose-600 hover:bg-rose-700 text-white",
    footerActionLink: "text-rose-600 hover:text-rose-700",
    identityPreviewEditButton: "text-rose-600",
  },
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-rose-500 to-pink-600 p-12 text-white">
        <div>
          <p className="text-2xl font-bold tracking-tight">Em & Me Studio</p>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Your influencer<br />hub, all in one place.
          </h1>
          <p className="mt-4 text-rose-100 text-lg">
            Campaigns, assets, payments, and analytics — built for the Em & Me creator community.
          </p>
        </div>
        <p className="text-rose-200 text-sm">© {new Date().getFullYear()} Em & Me Studio</p>
      </div>

      {/* Right auth panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <p className="text-2xl font-bold text-gray-900 lg:hidden">Em & Me Studio</p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">Welcome back</h2>
            <p className="mt-1 text-sm text-gray-500">Sign in to your portal account</p>
          </div>
          <SignIn appearance={clerkAppearance} />
        </div>
      </div>
    </div>
  );
}
