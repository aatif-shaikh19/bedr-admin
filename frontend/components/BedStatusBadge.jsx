export function BedStatusBadge({ status }) {
    const config = {
      available: {
        label: 'Available',
        className: 'bg-green-100 text-green-800 border-green-200',
      },
      occupied: {
        label: 'Occupied',
        className: 'bg-red-100 text-red-800 border-red-200',
      },
      under_maintenance: {
        label: 'Maintenance',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      },
    }
  
    const { label, className } = config[status] || config.available
  
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
        {label}
      </span>
    )
  }