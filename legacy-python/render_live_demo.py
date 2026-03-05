"""
Render the live demo HTML from pipeline steps.
"""


def render_steps_html(steps: list) -> str:
    """Convert steps dict to HTML."""
    html_parts = []
    for s in steps:
        title = s.get("title", "")
        formula = s.get("formula", "")
        output = s.get("output", "")
        inputs = s.get("inputs", {})
        params = s.get("params", {})
        calc = s.get("calc", {})

        parts = [f'<div class="step-card"><h2>{title}</h2>']
        parts.append(f'<div class="formula">{formula}</div>')

        if inputs and isinstance(inputs, dict):
            parts.append('<div class="inputs">')
            for k, v in inputs.items():
                if isinstance(v, (int, float)) and v > 1000:
                    parts.append(f'<strong>{k}:</strong> {v:,.0f} ')
                else:
                    parts.append(f'<strong>{k}:</strong> {v} ')
            parts.append('</div>')
        elif inputs and isinstance(inputs, str):
            parts.append(f'<div class="inputs">{inputs}</div>')

        if params:
            parts.append('<div class="calc">')
            for k, v in params.items():
                parts.append(f'<strong>{k}:</strong> {v:.4f} ')
            parts.append('</div>')

        if calc:
            parts.append('<div class="calc">')
            for k, v in calc.items():
                if isinstance(v, float):
                    parts.append(f'<strong>{k}:</strong> {v:.6f} ')
                else:
                    parts.append(f'<strong>{k}:</strong> {v} ')
            parts.append('</div>')

        if isinstance(output, dict):
            parts.append('<div class="output">')
            for k, v in output.items():
                if isinstance(v, (int, float)) and v >= 100:
                    parts.append(f'{k}: {v:,.2f}<br>')
                elif isinstance(v, float):
                    parts.append(f'{k}: {v:.4f}<br>')
                else:
                    parts.append(f'{k}: {v}<br>')
            parts.append('</div>')
        else:
            parts.append(f'<div class="output">→ {output}</div>')

        parts.append('</div>')
        html_parts.append(''.join(parts))

    return '\n'.join(html_parts) if html_parts else '<p class="subtitle">Enter parameters above and click Run to see the step-by-step math.</p>'


def render_bottom_line(steps: list) -> str:
    """Render the 'Bottom line' hedge summary from step 8 data."""
    for s in steps:
        if s.get("title") == "Step 8: What to buy" and isinstance(s.get("output"), dict):
            o = s["output"]
            n = o.get("Contracts to buy", 0)
            if isinstance(n, (int, float)):
                n_int = int(n)
            else:
                try:
                    n_int = int(float(str(n).replace(",", "")))
                except (ValueError, TypeError):
                    n_int = 0
            cost_str = o.get("Total upfront cost", "$0")
            try:
                cost_int = int(float(str(cost_str).replace("$", "").replace(",", "")))
            except (ValueError, TypeError):
                cost_int = 0
            pct = str(o.get("Chance it triggers in our simulation", "0%")).replace("%", "").strip()
            thresh = str(o.get("Triggers when unemployment exceeds", "8%")).replace("%", "").strip()
            return f'''<div class="hedge-summary" style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:1.25rem 1.5rem;margin-top:1rem;font-size:0.95rem;line-height:1.6;">
<strong>Bottom line:</strong> Buy <strong>{n_int:,} contracts</strong> that pay out if US unemployment exceeds {thresh}%. You pay <strong>${cost_int:,}</strong> upfront. If unemployment gets that high, you receive <strong>${n_int:,}</strong> — enough to cover about 6 months of pay. In our simulation, that happens in <strong>{pct}%</strong> of scenarios.
</div>'''
    return ""


def render_demo_options(industry: str, company_size: str, job_level: str) -> tuple:
    """Generate select options with current values selected."""
    industries = ["tech", "finance", "healthcare", "government"]
    companies = ["startup", "small", "medium", "large", "enterprise"]
    levels = [("entry", "Entry"), ("manager", "Manager"), ("exec", "Executive")]

    def opts(items, selected):
        if isinstance(items[0], tuple):
            return ''.join(
                f'<option value="{v}" {"selected" if v == selected else ""}>{lbl}</option>'
                for v, lbl in items
            )
        return ''.join(
            f'<option value="{x}" {"selected" if x == selected else ""}>{x.title()}</option>'
            for x in items
        )

    return opts(industries, industry), opts(companies, company_size), opts(levels, job_level)
