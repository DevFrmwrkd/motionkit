"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileJson, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function CreatorUpload() {
  const [step, setStep] = useState(1);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Upload Preset</h1>
        <p className="text-zinc-400">Bundle your Remotion component and publish it to the marketplace.</p>
      </div>

      {step === 1 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Step 1: Upload Bundle</CardTitle>
            <CardDescription className="text-zinc-400">
              Upload your zipped `.js` bundle containing the `PresetExport` interface.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-zinc-800 bg-zinc-950/50 rounded-xl p-12 text-center hover:border-amber-500/50 transition-colors cursor-pointer group">
              <UploadCloud className="w-12 h-12 text-zinc-600 mx-auto mb-4 group-hover:text-amber-500 transition-colors" />
              <h3 className="text-lg font-semibold text-zinc-200 mb-1">Drag & Drop your .zip file here</h3>
              <p className="text-sm text-zinc-500">or click to browse from your computer</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500/80 text-sm p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>Make sure your bundle exports <code>Component</code>, <code>schema</code>, and <code>meta</code>. Read the <a href="#" className="underline">Creator Guidelines</a> for details.</p>
            </div>
            <Button onClick={() => setStep(2)} className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold">
              Next Step: Details
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-zinc-100">Step 2: Preset Details</CardTitle>
              <div className="flex items-center text-sm text-green-500 font-medium">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Bundle Validated
              </div>
            </div>
            <CardDescription className="text-zinc-400">
              We parsed your schema and meta. Review and complete the listing details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Preset Name</Label>
                <Input defaultValue="Neon Cyberpunk Title" className="bg-zinc-950 border-zinc-800 text-zinc-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Description</Label>
                <Textarea 
                  defaultValue="A high-energy, neon-infused lower third perfect for gaming streams and tech reviews." 
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 min-h-[100px]" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Price (USD)</Label>
                  <Input type="number" defaultValue="4.99" className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                  <p className="text-xs text-zinc-500">Set to 0 for Free</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Category</Label>
                  <Input defaultValue="Lower Third" className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                </div>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-zinc-300 mb-2 flex items-center"><FileJson className="w-4 h-4 mr-2" /> Parsed Schema Fields</h4>
              <ul className="text-xs text-zinc-500 space-y-1">
                <li>• <span className="font-mono text-zinc-400">titleText</span> (text)</li>
                <li>• <span className="font-mono text-zinc-400">primaryColor</span> (color)</li>
                <li>• <span className="font-mono text-zinc-400">glowIntensity</span> (number)</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(1)} className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
                Back
              </Button>
              <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold">
                Publish to Marketplace
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
