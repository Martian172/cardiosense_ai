"""
app/services/agent_service.py — Dr. CardioBot: Gemini-powered cardiology assistant.

Key design decisions
--------------------
- NO startup ping test — avoids wasting free-tier quota on boot.
- Model fallback chain: tries models in order until one succeeds.
- Auto-retry on 429 RESOURCE_EXHAUSTED with next model in chain.
- Rich keyword-based RAG (no embedding API needed).
- Detailed fallback responses when ALL models are rate-limited.
"""

from __future__ import annotations

import logging
import re
import time
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Model fallback chain (tried in order) ────────────────────────────────────
_MODEL_CHAIN = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash-lite",
]

# ── Cardiology knowledge base ─────────────────────────────────────────────────
_KB: list[str] = [
    "The heart consists of four chambers: right atrium, right ventricle, left atrium, and left ventricle. The right side pumps deoxygenated blood to the lungs; the left side pumps oxygenated blood to the body.",
    "The sinoatrial (SA) node is the heart's natural pacemaker, generating 60-100 electrical impulses per minute. It sits in the right atrium and initiates each heartbeat.",
    "The atrioventricular (AV) node delays the electrical signal by ~120-200ms, allowing the atria to finish contracting before the ventricles begin.",
    "A normal ECG shows: P wave (atrial depolarisation, 80-120ms), PR interval (120-200ms), QRS complex (ventricular depolarisation, <120ms), ST segment (isoelectric), T wave (ventricular repolarisation).",
    "Normal sinus rhythm: rate 60-100 bpm, regular rhythm, P wave before every QRS, QRS <120ms, PR 120-200ms.",
    "ST elevation ≥1mm in two or more contiguous leads indicates STEMI (ST-Elevation Myocardial Infarction). This is a cardiac emergency requiring immediate reperfusion (PCI within 90 minutes or thrombolysis within 30 minutes).",
    "ST depression and T-wave inversion indicate NSTEMI or unstable angina (non-ST-elevation ACS). Troponin elevation confirms myocardial injury.",
    "Atrial fibrillation (AFib): irregularly irregular rhythm, absent P waves, fibrillatory baseline. Most common sustained arrhythmia (2-4% of adults). Increases stroke risk 5-fold. Treat with rate control (beta-blockers, CCBs) and anticoagulation (DOACs).",
    "Premature Ventricular Contractions (PVCs): wide bizarre QRS >120ms, no preceding P wave, compensatory pause. Isolated PVCs are usually benign. Frequent PVCs (>10% of beats) need evaluation.",
    "Ventricular tachycardia (VT): ≥3 consecutive PVCs at rate >100 bpm. Can cause haemodynamic instability. Sustained VT requires immediate treatment.",
    "Ventricular fibrillation (VF): chaotic disorganised activity — immediately life-threatening. Requires immediate defibrillation and CPR.",
    "Left bundle branch block (LBBB): wide QRS >120ms, broad notched R in V5-V6, deep S in V1. New LBBB may indicate STEMI (Sgarbossa criteria).",
    "Right bundle branch block (RBBB): rSR' pattern in V1, broad S wave in V6. Can be normal variant or indicate right heart strain/PE.",
    "First-degree AV block: PR >200ms — generally benign. Second-degree Mobitz I (Wenckebach): progressive PR prolongation. Mobitz II: sudden QRS drop. Third-degree (complete): no AV conduction — medical emergency.",
    "QTc prolongation >440ms (men) or >460ms (women) increases risk of Torsades de Pointes. Caused by medications, electrolyte imbalances, or congenital long QT syndrome.",
    "CardioSense AI uses a 1D Convolutional Autoencoder trained on normal sinus rhythm ECG signals.",
    "The autoencoder learns to reconstruct normal ECG patterns. Anomaly Score = MSE / (MSE + threshold). Score >0.5 is flagged as anomalous. A high score means the pattern deviates significantly from normal sinus rhythm.",
    "Anomaly score interpretation: 0.0-0.3 = likely normal, 0.3-0.5 = borderline (review recommended), 0.5-0.7 = probable anomaly, 0.7+ = high confidence anomaly. Always confirm with clinical evaluation.",
    "Localised anomaly detection uses a sliding window (50 samples, 25-step stride) to identify which segments of the ECG have the highest reconstruction error.",
    "Troponin I and T are biomarkers of myocardial injury. Elevated in STEMI, NSTEMI, myocarditis, heart failure. High-sensitivity troponin can detect injury within 1-3 hours.",
    "Left ventricular ejection fraction (LVEF): normal >55%, mildly reduced 41-54%, HFrEF ≤40%. Assessed by echocardiogram. EF <35% may qualify for ICD implantation.",
    "Beta-blockers (metoprolol, carvedilol): reduce heart rate and mortality post-MI, first-line for rate control in AFib. Contraindicated in acute decompensated heart failure.",
    "ACE inhibitors/ARBs (ramipril, losartan): cornerstone of HFrEF treatment, reduce afterload and cardiac remodelling. Monitor potassium and renal function.",
    "Holter monitor: 24-48 hour continuous ECG to detect intermittent arrhythmias. Patch monitors (Zio) can record up to 14 days. Insertable cardiac monitors (ICM) record up to 3 years.",
    "Echocardiogram: ultrasound of the heart. Assesses structure, wall motion, valve function, ejection fraction, and pericardial effusion.",
    "Cardiac catheterisation: invasive gold-standard for coronary artery disease. Used for diagnosis and treatment (PCI/stenting).",
    "CPR (cardiopulmonary resuscitation): 30 compressions (5-6cm depth, 100-120/min) to 2 breaths. Automated External Defibrillator (AED) should be used as soon as available for VF/pulseless VT.",
    "Risk factors for cardiovascular disease: hypertension, diabetes, hyperlipidaemia, smoking, obesity, family history, age (>45 men, >55 women), sedentary lifestyle.",
    "Heart rate zones: resting 60-100 bpm (normal), bradycardia <60 bpm, tachycardia >100 bpm. Athletes may have resting HR of 40-60 bpm (physiological).",
    "Palpitations are sensations of abnormal heartbeat. Causes range from benign (caffeine, anxiety, PVCs) to serious (SVT, AFib, VT). 12-lead ECG and Holter monitor are key investigations.",
    "Chest pain differential: ACS (crushing, radiates to arm/jaw), PE (pleuritic, tachycardia), pericarditis (sharp, worse lying flat, pericardial rub), aortic dissection (tearing, radiates to back), GERD (burning, related to meals).",
]

_STOP = {
    "a","an","the","is","are","was","were","be","been","being","have","has",
    "had","do","does","did","will","would","could","should","may","might",
    "to","of","in","for","on","with","at","by","from","as","about","what",
    "how","why","when","where","which","that","this","these","those","it",
    "and","or","not","no","so","if","me","my","i","you","your","we","they",
    "can","just","mean","means","does","please","tell","explain","describe",
}


def _keywords(text: str) -> set[str]:
    return {w for w in re.findall(r"\b[a-z]{3,}\b", text.lower()) if w not in _STOP}


def _retrieve(query: str, top_k: int = 5) -> list[str]:
    q_kw = _keywords(query)
    if not q_kw:
        return _KB[:3]
    scored = [(doc, len(q_kw & _keywords(doc)) / len(q_kw)) for doc in _KB]
    scored.sort(key=lambda x: x[1], reverse=True)
    results = [d for d, s in scored if s > 0][:top_k]
    return results if results else [d for d, _ in scored[:3]]


# ── Agent ─────────────────────────────────────────────────────────────────────

class AgentService:
    """Gemini-powered cardiology chatbot with model fallback and rich responses."""

    def __init__(self) -> None:
        self._client: Any = None
        self._working_model: str | None = None
        self._history: dict[str, list[dict[str, Any]]] = {}
        self._ready: bool = False

    def initialise(self) -> None:
        """Set up the Gemini client. No startup ping — quota preserved."""
        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not set — Dr. CardioBot in offline mode.")
            return
        try:
            from google import genai
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
            # Pre-select preferred model from config, or use head of chain
            preferred = getattr(settings, "GEMINI_MODEL", _MODEL_CHAIN[0])
            self._working_model = preferred if preferred in _MODEL_CHAIN else _MODEL_CHAIN[0]
            self._ready = True
            logger.info(
                "AgentService ready. Preferred model=%s | Chain=%s",
                self._working_model, _MODEL_CHAIN,
            )
        except Exception as exc:
            logger.error("AgentService init failed: %s", exc)

    def _build_prompt(
        self,
        message: str,
        history: list[dict[str, Any]],
        context_docs: list[str],
        scan_ctx: dict[str, Any] | None,
    ) -> str:
        lines = [
            "You are Dr. CardioBot, the AI cardiology assistant for CardioSense AI — "
            "an advanced ECG anomaly detection platform. Be medically accurate, empathetic, "
            "and use clear markdown formatting. Always recommend consulting a licensed physician "
            "for clinical decisions. Use bullet points and bold text to make answers readable."
        ]

        if scan_ctx:
            score = scan_ctx.get("anomaly_score", 0)
            risk = "HIGH ⚠️" if score > 0.6 else "MODERATE ⚡" if score > 0.35 else "LOW ✅"
            regions = len(scan_ctx.get("anomaly_regions", []))
            lines.append(
                f"\n**Current Patient ECG:**\n"
                f"- Scan: {scan_ctx.get('scan_name', 'Unnamed')}\n"
                f"- Anomaly Detected: {'YES' if scan_ctx.get('is_anomalous') else 'NO'}\n"
                f"- Anomaly Score: {score:.1%} (Risk: {risk})\n"
                f"- Reconstruction Error: {scan_ctx.get('reconstruction_error', 0):.5f}\n"
                f"- Flagged Segments: {regions}\n"
                "Tailor your response to this specific patient's ECG findings."
            )

        if context_docs:
            lines.append("\n**Relevant Cardiology Knowledge:**\n" +
                         "\n".join(f"• {d}" for d in context_docs))

        lines.append("\n**Conversation:**")
        for turn in history[-8:]:
            role = "Doctor" if turn["role"] == "user" else "Dr. CardioBot"
            lines.append(f"{role}: {turn['content']}")
        lines.append(f"Doctor: {message}")
        lines.append("Dr. CardioBot:")
        return "\n".join(lines)

    def _try_generate(self, prompt: str) -> str | None:
        """Try each model in chain. Cache the working one. Returns None if all fail."""
        # Build the model chain: preferred model first, then rest
        chain = [self._working_model] + [m for m in _MODEL_CHAIN if m != self._working_model]

        for model in chain:
            try:
                resp = self._client.models.generate_content(model=model, contents=prompt)
                if resp.text:
                    if model != self._working_model:
                        logger.info("Switched working model to %s", model)
                        self._working_model = model
                    return resp.text
            except Exception as exc:
                err = str(exc)
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    logger.warning("Model %s quota exceeded, trying next...", model)
                    continue
                elif "404" in err or "NOT_FOUND" in err:
                    logger.warning("Model %s not found, trying next...", model)
                    continue
                else:
                    logger.error("Model %s error: %s", model, err[:200])
                    break  # Non-quota error, don't try others
        return None

    def _history_for(self, session_id: str) -> list[dict[str, Any]]:
        if session_id not in self._history:
            self._history[session_id] = []
        return self._history[session_id]

    async def chat(
        self,
        message: str,
        session_id: str,
        scan_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        history = self._history_for(session_id)
        history.append({
            "role": "user",
            "content": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        context_docs = _retrieve(message)
        response_text: str
        fallback = False

        if self._ready and self._client:
            prompt = self._build_prompt(message, history[:-1], context_docs, scan_context)
            result = self._try_generate(prompt)
            if result:
                response_text = result
            else:
                logger.warning("All Gemini models exhausted — using rich fallback.")
                response_text = self._rich_fallback(message, context_docs, scan_context)
                fallback = True
        else:
            response_text = self._rich_fallback(message, context_docs, scan_context)
            fallback = True

        history.append({
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        return {
            "response": response_text,
            "session_id": session_id,
            "sources": [d[:120] + "…" for d in context_docs],
            "fallback": fallback,
            "model": self._working_model if not fallback else "offline",
        }

    def get_history(self, session_id: str) -> list[dict[str, Any]]:
        return self._history_for(session_id)

    @staticmethod
    def _rich_fallback(
        message: str,
        context_docs: list[str],
        scan_ctx: dict[str, Any] | None,
    ) -> str:
        """Generate a rich, knowledge-based response without calling any API."""
        lower = message.lower()

        # Build scan context block if available
        scan_block = ""
        if scan_ctx:
            score = scan_ctx.get("anomaly_score", 0)
            risk = "HIGH ⚠️" if score > 0.6 else "MODERATE ⚡" if score > 0.35 else "LOW ✅"
            anomalous = scan_ctx.get("is_anomalous", False)
            regions = len(scan_ctx.get("anomaly_regions", []))
            scan_block = (
                f"\n\n---\n**Your ECG Analysis:**\n"
                f"- Result: {'🔴 Anomaly Detected' if anomalous else '🟢 Normal Pattern'}\n"
                f"- Anomaly Score: **{score:.1%}** ({risk})\n"
                f"- Flagged Segments: {regions}\n"
            )

        # Build knowledge block from retrieved docs
        kb_block = ""
        if context_docs:
            kb_block = "\n\n---\n**Relevant Medical Facts:**\n" + "\n".join(
                f"• {d}" for d in context_docs[:3]
            )

        # Topic-specific detailed responses
        if any(k in lower for k in ["anomaly score", "high score", "score mean", "score high", "result mean", "what does"]):
            return (
                "## Understanding Your Anomaly Score\n\n"
                "The **anomaly score** measures how different your ECG pattern is from normal sinus rhythm "
                "as learned by the CardioSense AI autoencoder:\n\n"
                "| Score Range | Interpretation | Action |\n"
                "|---|---|---|\n"
                "| 0% – 30% | ✅ Likely Normal | Routine monitoring |\n"
                "| 30% – 50% | ⚡ Borderline | Clinical review recommended |\n"
                "| 50% – 70% | ⚠️ Probable Anomaly | Consult cardiologist |\n"
                "| 70% – 99% | 🔴 High Confidence Anomaly | Urgent evaluation |\n\n"
                "**How it works:** The AI was trained only on normal ECGs. It tries to reconstruct your signal. "
                "A high reconstruction error → high anomaly score → the pattern is unusual.\n\n"
                "> ⚕️ **Important:** A high score does NOT diagnose a specific condition. "
                "Always consult a licensed cardiologist for clinical interpretation."
                + scan_block
            )

        if any(k in lower for k in ["stemi", "st elevation", "heart attack", "mi", "myocardial"]):
            return (
                "## STEMI — ST-Elevation Myocardial Infarction\n\n"
                "**STEMI is a medical emergency** — a complete blockage of a coronary artery.\n\n"
                "**ECG Signs:**\n"
                "- ST elevation ≥1mm in ≥2 contiguous leads\n"
                "- Reciprocal ST depression in opposite leads\n"
                "- New LBBB may also indicate STEMI\n"
                "- Later: Q waves, T-wave inversion\n\n"
                "**Treatment (time-critical):**\n"
                "- **Primary PCI** (angioplasty + stent) within **90 minutes** of first medical contact\n"
                "- **Thrombolysis** (tPA) if PCI not available within 30 minutes\n"
                "- Aspirin 300mg + P2Y12 inhibitor (ticagrelor/clopidogrel) immediately\n"
                "- Heparin anticoagulation\n\n"
                "> 🚨 **If you suspect STEMI, call emergency services immediately. Every minute counts.**"
                + scan_block + kb_block
            )

        if any(k in lower for k in ["afib", "atrial fibrillation", "irregular", "fibrillation"]):
            return (
                "## Atrial Fibrillation (AFib)\n\n"
                "AFib is the **most common sustained cardiac arrhythmia**, affecting 2-4% of adults.\n\n"
                "**ECG Features:**\n"
                "- Irregularly irregular rhythm (no fixed RR interval)\n"
                "- Absent P waves (replaced by fibrillatory baseline ~350-600/min)\n"
                "- Narrow QRS (usually, unless aberrant conduction)\n\n"
                "**Why it's dangerous:**\n"
                "- Blood pools in atria → clots → **5× increased stroke risk**\n"
                "- Can cause heart failure from fast, uncontrolled rate\n\n"
                "**Treatment:**\n"
                "- **Rate control:** Beta-blockers (metoprolol) or CCBs (diltiazem)\n"
                "- **Rhythm control:** Cardioversion (electrical or pharmacological)\n"
                "- **Anticoagulation:** DOACs (apixaban, rivaroxaban) to prevent stroke\n"
                "- **Ablation:** Pulmonary vein isolation for recurrent AFib\n\n"
                "> ⚕️ CHA₂DS₂-VASc score determines anticoagulation need."
                + scan_block + kb_block
            )

        if any(k in lower for k in ["pvc", "premature ventricular", "ectopic", "skipped beat"]):
            return (
                "## Premature Ventricular Contractions (PVCs)\n\n"
                "PVCs are early heartbeats originating from the ventricles rather than the SA node.\n\n"
                "**ECG Features:**\n"
                "- Wide, bizarre QRS complex >120ms\n"
                "- No preceding P wave\n"
                "- Compensatory pause after PVC\n"
                "- T wave in opposite direction to QRS\n\n"
                "**Patterns:**\n"
                "- Bigeminy: every other beat is a PVC\n"
                "- Trigeminy: every 3rd beat\n"
                "- Couplet: 2 consecutive PVCs\n\n"
                "**When to worry:**\n"
                "- PVC burden >10% of total beats\n"
                "- PVCs on T-wave (R-on-T phenomenon)\n"
                "- PVCs in structural heart disease\n"
                "- Runs of PVCs (→ VT risk)\n\n"
                "**Treatment:** Often none needed. Beta-blockers for symptomatic PVCs. "
                "Catheter ablation for high-burden PVCs causing cardiomyopathy."
                + scan_block + kb_block
            )

        if any(k in lower for k in ["normal", "sinus rhythm", "healthy", "fine", "ok"]):
            return (
                "## Normal Sinus Rhythm\n\n"
                "A normal ECG shows:\n\n"
                "| Feature | Normal Value |\n"
                "|---|---|\n"
                "| Heart Rate | 60–100 bpm |\n"
                "| PR Interval | 120–200 ms |\n"
                "| QRS Duration | <120 ms |\n"
                "| QTc | <440 ms (men), <460 ms (women) |\n"
                "| ST Segment | Isoelectric (flat) |\n\n"
                "**What it means:**\n"
                "- P wave before every QRS → normal SA node pacing\n"
                "- Regular RR intervals → consistent rhythm\n"
                "- Normal QRS → normal ventricular conduction\n\n"
                "A normal CardioSense AI score (< 0.3) combined with normal morphology is reassuring, "
                "but regular check-ups are still recommended."
                + scan_block
            )

        if any(k in lower for k in ["chest pain", "chest", "pain", "discomfort", "pressure"]):
            return (
                "## Chest Pain — Key Differentials\n\n"
                "Chest pain has many causes — some emergencies, some benign:\n\n"
                "**🚨 Emergencies (call 999/911 immediately):**\n"
                "- **STEMI/ACS:** crushing pressure, radiates to arm/jaw, sweating\n"
                "- **Pulmonary Embolism:** sudden onset, pleuritic, tachycardia, O₂ drop\n"
                "- **Aortic Dissection:** tearing pain radiating to back, BP difference arm-to-arm\n\n"
                "**Non-emergencies (still needs evaluation):**\n"
                "- **Pericarditis:** sharp, worse lying flat, better sitting forward\n"
                "- **GERD:** burning, worse after meals, relieved by antacids\n"
                "- **Musculoskeletal:** reproducible on palpation\n"
                "- **Anxiety:** often with palpitations, shortness of breath\n\n"
                "> ⚕️ **Any new chest pain should be evaluated by a doctor.** "
                "If in doubt, seek emergency care immediately."
                + scan_block
            )

        if any(k in lower for k in ["treatment", "medication", "medicine", "drug", "treat"]):
            return (
                "## Common Cardiac Medications\n\n"
                "**Heart Rate/Rhythm Control:**\n"
                "- **Beta-blockers** (metoprolol, carvedilol): rate control, post-MI mortality ↓\n"
                "- **CCBs** (diltiazem, verapamil): rate control in AFib\n"
                "- **Amiodarone:** rhythm control, highly effective but side effects\n\n"
                "**Heart Failure:**\n"
                "- **ACE inhibitors/ARBs** (ramipril, losartan): reduce remodelling\n"
                "- **Sacubitril/valsartan:** superior to ACE-I in HFrEF\n"
                "- **SGLT2 inhibitors** (dapagliflozin): reduce hospitalisation\n"
                "- **Aldosterone antagonists** (spironolactone): reduce mortality\n\n"
                "**ACS/Clot Prevention:**\n"
                "- **Aspirin + P2Y12** (ticagrelor/clopidogrel): dual antiplatelet post-ACS\n"
                "- **DOACs** (apixaban, rivaroxaban): stroke prevention in AFib\n"
                "- **Statins** (atorvastatin): LDL reduction, plaque stabilisation\n\n"
                "> ⚕️ All medications require prescription and monitoring by a physician."
                + scan_block
            )

        # Generic helpful response with retrieved KB
        intro = (
            "## Dr. CardioBot — Cardiology Assistant\n\n"
            "I can help you understand:\n"
            "- 📊 **Your ECG results** and anomaly score\n"
            "- ❤️ **Cardiac conditions** (AFib, STEMI, PVCs, heart blocks)\n"
            "- 💊 **Medications** and treatment approaches\n"
            "- 🔬 **Diagnostic tests** (ECG, echo, Holter, cath lab)\n"
            "- 🏃 **Lifestyle** and prevention strategies\n\n"
            "**Ask me anything** — for example:\n"
            "- *'What does my anomaly score of 65% mean?'*\n"
            "- *'Explain atrial fibrillation'*\n"
            "- *'What are the symptoms of a heart attack?'*\n"
        )
        return intro + scan_block + kb_block


# ── Singleton ─────────────────────────────────────────────────────────────────
_instance: AgentService | None = None


def get_agent_service() -> AgentService:
    global _instance
    if _instance is None:
        raise RuntimeError("AgentService not initialised — call initialise_agent_service() at startup.")
    return _instance


def initialise_agent_service() -> AgentService:
    global _instance
    if _instance is None:
        _instance = AgentService()
        _instance.initialise()
    return _instance
