import React from "react";
import { Switch, Tooltip } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useTheme } from "../theme/ThemeProvider";

export default function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();
    const isDark = theme === "dark";

    return (
        <Tooltip title={isDark ? "Switch to light" : "Switch to dark"}>
            <Switch
                checked={isDark}
                onChange={(checked) => setTheme(checked ? "dark" : "light")}
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
                style={{
                    backgroundColor: isDark ? "#1890ff" : "#fa8c16",
                }}
            />
        </Tooltip>
    );
}
