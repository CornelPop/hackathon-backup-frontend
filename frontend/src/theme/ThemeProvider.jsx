import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { App as AntApp, ConfigProvider, theme as antdTheme } from "antd";

const ThemeContext = createContext(null); // { theme, setTheme, toggleTheme }

function getSystemPrefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getInitialTheme() {
    const saved = localStorage.getItem("app-theme");
    return saved || "system"; // "light" | "dark" | "system"
}

export default function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(getInitialTheme);

    // persist and expose the effective theme via <html data-theme="">
    useEffect(() => {
        localStorage.setItem("app-theme", theme);
        const effective = theme === "system" ? (getSystemPrefersDark() ? "dark" : "light") : theme;
        document.documentElement.setAttribute("data-theme", effective);
    }, [theme]);

    // keep in sync with OS if user selected "system"
    useEffect(() => {
        if (theme !== "system") return;
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            document.documentElement.setAttribute("data-theme", mq.matches ? "dark" : "light");
        };
        mq.addEventListener?.("change", handler);
        return () => mq.removeEventListener?.("change", handler);
    }, [theme]);

    const isDark = theme === "system" ? getSystemPrefersDark() : theme === "dark";

    const antdThemeConfig = useMemo(
        () => ({
            algorithm: isDark
                ? antdTheme.darkAlgorithm
                : antdTheme.defaultAlgorithm,

            token: {
                colorPrimary: "#5B8FF9",

                // Page background
                colorBgLayout: isDark ? "#1F1F1F" : "#f5f5f5",

                // Card background
                colorBgContainer: isDark ? "#2B2B2B" : "#ffffff",

                // Optional: card border color
                colorBorderSecondary: isDark ? "#444" : "#e5e5e5",

                // Optional: text color
                colorText: isDark ? "#f5f5f5" : "#1F1F1F",
            },

            // Optional component overrides
            // components: {
            //   Card: { borderRadiusLG: 16 },
            //   Button: { borderRadius: 10 },
            // },
        }),
        [isDark]
    );


    const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"));

    const ctx = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);

    return (
        <ThemeContext.Provider value={ctx}>
            <ConfigProvider theme={antdThemeConfig}>
                <AntApp>{children}</AntApp>
            </ConfigProvider>
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const c = useContext(ThemeContext);
    if (!c) throw new Error("useTheme must be used inside <ThemeProvider>");
    return c;
}
