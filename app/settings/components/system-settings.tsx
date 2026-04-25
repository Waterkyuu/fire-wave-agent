"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "refract-custom-rules";

const SystemSettings = () => {
	const t = useTranslations("settings.system");
	const [rules, setRules] = useState(() => {
		if (typeof window === "undefined") return "";
		return localStorage.getItem(STORAGE_KEY) || "";
	});
	const [saving, setSaving] = useState(false);

	const handleSave = useCallback(async () => {
		setSaving(true);
		try {
			localStorage.setItem(STORAGE_KEY, rules);
			toast.success(t("saved"));
		} catch {
			toast.error(t("saveFailed"));
		} finally {
			setSaving(false);
		}
	}, [rules, t]);

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-lg tracking-tight">{t("title")}</h2>
				<p className="mt-1 text-muted-foreground text-sm">{t("description")}</p>
			</div>

			<div className="space-y-2">
				<Label htmlFor="custom-rules">{t("customRules")}</Label>
				<Textarea
					id="custom-rules"
					placeholder={t("customRulesPlaceholder")}
					value={rules}
					onChange={(e) => setRules(e.target.value)}
					className="min-h-[180px] resize-y"
				/>
				<p className="text-muted-foreground text-xs">{t("helperText")}</p>
			</div>

			<Button onClick={handleSave} disabled={saving}>
				{saving ? t("saving") : t("save")}
			</Button>
		</div>
	);
};

export default SystemSettings;
