import GithubIcon from "../assets/icons/github.svg?raw";
import LinkedinIcon from "../assets/icons/linkedin.svg?raw";
import BlueskyIcon from "../assets/icons/bluesky.svg?raw";
import ResumeIcon from "../assets/icons/resume.svg?raw";

export const siteData = {
  title: "Samsite",
  navItems: [
    { label: "Projects", href: "/projects" },
    { label: "Photography", href: "/photography", current: false },
    { label: "Art", href: "/art" },
    { label: "About", href: "/about" },
  ],
  personalLinks: [
    {
      label: "Github",
      href: "https://github.com/sam-young-dev",
      isExternal: true,
      icon: GithubIcon,
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/samuel-young-383044168",
      isExternal: true,
      icon: LinkedinIcon,
    },
    {
      label: "Bluesky",
      href: "https://bsky.app/profile/youngsc.bsky.social",
      isExternal: true,
      icon: BlueskyIcon,
    },
    { label: "Resume", href: "/resume", isExternal: false, icon: ResumeIcon },
  ],
};
