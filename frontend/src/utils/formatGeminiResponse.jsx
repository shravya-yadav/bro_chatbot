import React from "react";

export function formatGeminiResponse(response) {
  const lines = response.split("\n");
  const sections = {};
  let currentSection = "General";

  lines.forEach((line) => {
    line = line.trim();
    if (!line) return;

    // **Section Headings**
    const boldHeadingMatch = line.match(/^\*\*(.+?):\*\*$/);
    const regularHeadingMatch = line.match(/^([A-Za-z ]+):$/);

    if (boldHeadingMatch) {
      currentSection = boldHeadingMatch[1].trim();
      sections[currentSection] = [];
    } else if (regularHeadingMatch) {
      currentSection = regularHeadingMatch[1].trim();
      sections[currentSection] = [];
    } else {
      if (!sections[currentSection]) sections[currentSection] = [];
      sections[currentSection].push(line);
    }
  });

  return (
    <div className="space-y-4">
      {Object.entries(sections).map(([section, items], idx) => (
        <div key={idx}>
          <h3 className="text-lg font-bold text-gray-800">{section}</h3>
          <div className="ps-5 mt-1 space-y-2">
            {items.map((item, index) => {
              const cleanItem = item.replace(/\*/g, ""); // remove all asterisks

              // Bold single-line note
              if (/^\*.*\*$/.test(item)) {
                return (
                  <div key={index} className="font-semibold">
                    {cleanItem}
                  </div>
                );
              }

              // URLs
              const urlRegex = /(https?:\/\/[^\s]+)/g;
              if (urlRegex.test(item)) {
                const url = item.match(urlRegex)[0];
                return (
                  <div key={index} className="text-blue-600 underline">
                    🔗 <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                  </div>
                );
              }

              // Bullet point
              return <li key={index} className="list-disc">{cleanItem.replace(/^[-•]\s*/, "")}</li>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
