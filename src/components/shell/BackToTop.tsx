import { useEffect, useState } from "react";
import { Rocket } from "lucide-react";

/** 滚过这个距离才浮现,首屏内不与页头快捷栏抢注意力。 */
const SHOW_AFTER_PX = 480;

/** 右下角火箭按钮:滚过约一屏后出现,点击平滑回顶;样式走快捷栏同款玻璃圆钮。 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <button
      type="button"
      className="back-to-top control-button"
      data-visible={visible ? "true" : "false"}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="返回顶部"
      title="返回顶部"
    >
      <Rocket size={16} strokeWidth={2} aria-hidden />
    </button>
  );
}
