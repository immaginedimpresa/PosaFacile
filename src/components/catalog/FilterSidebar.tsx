import type { Dispatch, SetStateAction } from 'react'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'

import {
    catalogCategories,
    initialCatalogFilters,
    type CatalogFilters,
} from '@/lib/catalogFilters'

interface FilterSidebarProps {
    filters: CatalogFilters
    setFilters: Dispatch<SetStateAction<CatalogFilters>>
    className?: string
}

export function FilterSidebar({
    filters,
    setFilters,
    className = '',
}: FilterSidebarProps) {
    const invalidRange =
        filters.minPrice !== '' &&
        filters.maxPrice !== '' &&
        Number(filters.minPrice) > Number(filters.maxPrice)
    return (
        <div className={`pf-catalog-filters ${className}`}>
            <div className="pf-filter-heading">
                <h2>
                    <SlidersHorizontal size={16} /> La tua selezione
                </h2>
                <button
                    onClick={() => setFilters(initialCatalogFilters)}
                    aria-label="Azzera tutti i filtri"
                >
                    <RotateCcw size={15} />
                </button>
            </div>
            <fieldset>
                <legend>Destinazione d’uso</legend>
                {catalogCategories.map((category) => (
                    <label key={category.label}>
                        <input
                            type="radio"
                            name="catalog-category"
                            checked={filters.category === category.id}
                            onChange={() =>
                                setFilters((previous) => ({
                                    ...previous,
                                    category: category.id,
                                }))
                            }
                        />
                        <span>{category.label}</span>
                    </label>
                ))}
            </fieldset>
            <fieldset>
                <legend>Il tuo budget al m²</legend>
                <div className="pf-price-inputs">
                    <label>
                        <span>Da €</span>
                        <input
                            aria-label="Prezzo minimo al metro quadro"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={filters.minPrice}
                            onChange={(event) =>
                                setFilters((previous) => ({
                                    ...previous,
                                    minPrice: event.target.value,
                                }))
                            }
                        />
                    </label>
                    <span>—</span>
                    <label>
                        <span>A €</span>
                        <input
                            aria-label="Prezzo massimo al metro quadro"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Max"
                            value={filters.maxPrice}
                            onChange={(event) =>
                                setFilters((previous) => ({
                                    ...previous,
                                    maxPrice: event.target.value,
                                }))
                            }
                        />
                    </label>
                </div>
                {invalidRange && (
                    <p role="status" className="pf-filter-error">
                        Il massimo deve essere maggiore o uguale al minimo.
                    </p>
                )}
            </fieldset>
            <label className="pf-availability">
                <input
                    type="checkbox"
                    checked={filters.availableOnly}
                    onChange={(event) =>
                        setFilters((previous) => ({
                            ...previous,
                            availableOnly: event.target.checked,
                        }))
                    }
                />
                <span>
                    Solo prodotti disponibili
                    <small>Con quantità in magazzino</small>
                </span>
            </label>
            <p className="pf-filter-note">
                Hai trovato quello giusto? Apri il prodotto e aggiungilo al tuo
                progetto con la posa.
            </p>
        </div>
    )
}
