import type { ReactNode } from "react";
import { version } from "../../../package.json";

/**
 * 站点底部署名：后端项目 + 本主题，各带 GitHub 链接。
 *
 * 由后端作者提出，两条都放到每一页的最下面。链接写死在这里而不是走后台配置：这是「这套面板由什么构成」
 * 的事实，不是站长可配置的展示项。
 *
 * 与 CFSM 的差异：CFSM 读 CF 后端的 /api/config 提示「新版 vX」角标；monitor 的 /api/version 只对
 * 登录管理员开放，运行时拿不到版本号，所以这里显示构建时烘进 bundle 的主题版本（package.json）——
 * 它恰好回答「hub 现在服务的 dist 是哪一版」。
 */

const BACKEND_REPO_URL = "https://github.com/monitor-probe/monitor";
const THEME_REPO_URL = "https://github.com/lcyan/Monitor-Theme-LuminaPlus";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span className="site-footer-item">
        Powered by{" "}
        <FooterLink href={BACKEND_REPO_URL}>monitor</FooterLink>
      </span>
      <span className="site-footer-sep" aria-hidden>
        ·
      </span>
      <span className="site-footer-item">
        Theme by{" "}
        <FooterLink href={THEME_REPO_URL}>LuminaPlus</FooterLink>{" "}
        <span className="site-footer-version">v{version}</span>
      </span>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      className="site-footer-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
