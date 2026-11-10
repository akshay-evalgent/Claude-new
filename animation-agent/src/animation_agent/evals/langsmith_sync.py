"""Optional: upload the frozen datasets to LangSmith, so experiments can run against them there.

Needs LANGSMITH_API_KEY. Not exercised in the cloud session that built this (no key there);
the fake-client test checks the calls it makes.
"""
from __future__ import annotations

from typing import Any

from ..config import settings

FIELDS = {  # dataset -> (input keys, output keys)
    "triage": (["line"], ["label"]),
    "analyst": (["source"], []),
    "qa": (["question"], ["relevant"]),
}


def push(datasets: dict[str, list[dict]], client: Any = None, replace: bool = False) -> list[str]:
    if client is None:
        from langsmith import Client

        client = Client(api_key=settings.langsmith_api_key or None, api_url=settings.langsmith_endpoint)
    done = []
    for name, rows in datasets.items():
        ins, outs = FIELDS[name]
        ds_name = f"animation-agent-{name}"
        if client.has_dataset(dataset_name=ds_name):
            if not replace:
                done.append(f"{ds_name}: already exists (use --replace to overwrite)")
                continue
            client.delete_dataset(dataset_name=ds_name)
        ds = client.create_dataset(ds_name, description=f"animation-agent {name} eval set")
        examples = [{"inputs": {k: r.get(k) for k in ins}, "outputs": {k: r.get(k) for k in outs}}
                    for r in rows if all(r.get(k) is not None for k in outs)]
        client.create_examples(dataset_id=ds.id, examples=examples)
        done.append(f"{ds_name}: {len(examples)} examples")
    return done
