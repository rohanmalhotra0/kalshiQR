"""
Generate static live-demo.html for GitHub Pages.
Runs pipeline with default params and embeds the step-by-step output.
"""

from pathlib import Path

from config import load_config
load_config()


def main():
    from pipeline_steps import run_pipeline_steps
    from render_live_demo import render_steps_html, render_demo_options

    data = run_pipeline_steps(
        n_paths=1500,
        horizon_years=10,
        salary=120_000,
        industry="tech",
        company_size="startup",
        job_level="entry",
        seed=42,
    )
    steps_html = render_steps_html(data["steps"])
    industry_options, company_options, job_options = render_demo_options("tech", "startup", "entry")

    template = Path(__file__).parent / "live_demo.html"
    html = template.read_text(encoding="utf-8")
    html = html.replace("{{ industry_options }}", industry_options)
    html = html.replace("{{ company_options }}", company_options)
    html = html.replace("{{ job_options }}", job_options)
    html = html.replace("{{ salary }}", "120000")
    html = html.replace("{{ n_paths }}", "1500")
    html = html.replace("{{ horizon_years }}", "10")
    html = html.replace("{{ steps_html }}", steps_html)
    html = html.replace('href="/paper"', 'href="paper.html"')
    html = html.replace('href="/quiz"', 'href="quiz.html"')
    html = html.replace('href="/live-demo"', 'href="live-demo.html"')
    html = html.replace('href="/documentation"', 'href="documentation.html"')
    html = html.replace('href="/about"', 'href="about.html"')
    html = html.replace('href="/"', 'href="index.html"')
    html = html.replace('href="/favicon.png"', 'href="favicon.png"')

    out_path = Path(__file__).parent / "live-demo.html"
    out_path.write_text(html, encoding="utf-8")
    print(f"Generated {out_path}")


if __name__ == "__main__":
    main()
