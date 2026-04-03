import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Minimal responsive React hook subscribing onto browser window matching constraints mapping logical mobile bounds dynamically.
 * Updates strictly via targeted window resize event mappings bound natively over `768px`.
 * @returns Boolean denoting actively bound responsive states (true if Mobile).
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
