"use client"

import { useRef, useState } from "react"

export type AnimPhase = "idle" | "prepare" | "animating"
type Direction = "left" | "right"

/**
 * Slides between a product's images: auto-cycles on desktop hover and
 * follows horizontal swipes on touch devices.
 */
export function useImageCycle(validImages: string[], firstSrc: string) {
    const [currentSrc, setCurrentSrc] = useState(firstSrc)
    const [nextSrc, setNextSrc] = useState("")
    const [phase, setPhase] = useState<AnimPhase>("idle")
    const [activeImageIndex, setActiveImageIndex] = useState(0)

    const imageIndexRef = useRef(0)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const rafRef = useRef<number | null>(null)
    const touchStartXRef = useRef<number | null>(null)
    const touchStartYRef = useRef<number | null>(null)
    const animDirRef = useRef<Direction>("left")

    const cancelPending = () => {
        if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }

    // Two animation frames let the "prepare" position paint before the slide starts.
    const slideTo = (newSrc: string) => {
        cancelPending()
        setNextSrc(newSrc)
        setPhase("prepare")
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = requestAnimationFrame(() => {
                setPhase("animating")
                animTimeoutRef.current = setTimeout(() => {
                    setCurrentSrc(newSrc)
                    setNextSrc("")
                    setPhase("idle")
                }, 440)
            })
        })
    }

    const handleMouseEnter = () => {
        if (validImages.length <= 1) return
        if (typeof window !== "undefined" && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
        intervalRef.current = setInterval(() => {
            imageIndexRef.current = (imageIndexRef.current + 1) % validImages.length
            slideTo(validImages[imageIndexRef.current])
        }, 1400)
    }

    const handleMouseLeave = () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        cancelPending()
        imageIndexRef.current = 0
        setActiveImageIndex(0)
        setCurrentSrc(firstSrc)
        setNextSrc("")
        setPhase("idle")
    }

    const goToImage = (nextIndex: number, direction: Direction) => {
        if (validImages.length <= 1) return
        animDirRef.current = direction
        imageIndexRef.current = nextIndex
        setActiveImageIndex(nextIndex)
        slideTo(validImages[nextIndex])
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartXRef.current = e.touches[0]?.clientX ?? null
        touchStartYRef.current = e.touches[0]?.clientY ?? null
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartXRef.current === null || touchStartYRef.current === null || validImages.length <= 1) return
        const deltaX = (e.changedTouches[0]?.clientX ?? 0) - touchStartXRef.current
        const deltaY = (e.changedTouches[0]?.clientY ?? 0) - touchStartYRef.current
        touchStartXRef.current = null
        touchStartYRef.current = null
        // Ignore if swipe is too short or clearly more vertical than horizontal
        if (Math.abs(deltaX) < 30 || Math.abs(deltaX) < Math.abs(deltaY)) return
        const direction = deltaX < 0 ? "left" : "right"
        const nextIndex = direction === "left"
            ? (imageIndexRef.current + 1) % validImages.length
            : (imageIndexRef.current - 1 + validImages.length) % validImages.length
        goToImage(nextIndex, direction)
    }

    return {
        currentSrc,
        nextSrc,
        phase,
        activeImageIndex,
        animDirRef,
        handleMouseEnter,
        handleMouseLeave,
        handleTouchStart,
        handleTouchEnd,
    }
}
