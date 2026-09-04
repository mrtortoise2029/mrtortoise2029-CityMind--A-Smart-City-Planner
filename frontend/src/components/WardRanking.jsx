export function WardRanking({ wards }) {
  const ranked = [...wards].sort((a, b) => b.healthScore - a.healthScore);
  return (
    <article className="panel ranking-panel">
      <div className="panel-heading"><div><p className="eyebrow">Ward comparison</p><h2>Urban health ranking</h2></div></div>
      <div className="ranking-list">{ranked.map((ward, index) => <div key={ward.id}><span>{index + 1}</span><strong>{ward.name}</strong><div><i style={{ width: `${ward.healthScore}%` }} /></div><b>{ward.healthScore}</b></div>)}</div>
    </article>
  );
}

