"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { CargoItem } from "./types";

export function CargoItemsEditor({
  items,
  onChange,
}: {
  items: CargoItem[];
  onChange: (items: CargoItem[]) => void;
}) {
  function updateItem(index: number, key: keyof CargoItem, value: string) {
    onChange(
      items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (
          key === "description" ||
          key === "hsCode" ||
          key === "quantityUnit" ||
          key === "dimensions" ||
          key === "currency"
        )
          return { ...item, [key]: value };
        const numericValue = value === "" ? 0 : Number(value);
        return {
          ...item,
          [key]:
            Number.isFinite(numericValue) && numericValue >= 0
              ? numericValue
              : 0,
        };
      }),
    );
  }

  function addItem() {
    onChange([
      ...items,
      {
        description: "",
        hsCode: "",
        packages: 0,
        quantity: 0,
        quantityUnit: "",
        netKg: 0,
        grossKg: 0,
        dimensions: "",
        volumeM3: 0,
        unitPrice: 0,
        currency: "",
        amount: 0,
      },
    ]);
  }

  // Only show a cargo column when the source document contains a value for it.
  const show = {
    description: items.some((item) => item.description.trim()),
    hsCode: items.some((item) => item.hsCode.trim()),
    packages: items.some((item) => item.packages > 0),
    quantity: items.some(
      (item) => item.quantity > 0 || item.quantityUnit.trim(),
    ),
    netKg: items.some((item) => item.netKg > 0),
    grossKg: items.some((item) => item.grossKg > 0),
    dimensions: items.some((item) => item.dimensions.trim()),
    volumeM3: items.some((item) => item.volumeM3 > 0),
    unitPrice: items.some((item) => item.unitPrice > 0),
    currency: items.some((item) => item.currency.trim()),
    amount: items.some((item) => item.amount > 0),
  };
  const visibleColumnCount = Object.values(show).filter(Boolean).length + 2; // drag + actions

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-262.5 border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wide text-slate-400">
              <th className="w-8 px-2 py-2" aria-label="Drag handle"></th>
              {show.description && <th className="px-2 py-2">Description</th>}
              {show.hsCode && <th className="px-2 py-2">HS code</th>}
              {show.packages && <th className="px-2 py-2">Packages</th>}
              {show.quantity && <th className="px-2 py-2">Quantity</th>}
              {show.netKg && <th className="px-2 py-2">Net kg</th>}
              {show.grossKg && <th className="px-2 py-2">Gross kg</th>}
              {show.dimensions && <th className="px-2 py-2">Dimensions</th>}
              {show.volumeM3 && <th className="px-2 py-2">Volume m³</th>}
              {show.unitPrice && <th className="px-2 py-2">Unit price</th>}
              {show.currency && <th className="px-2 py-2">Currency</th>}
              {show.amount && <th className="px-2 py-2">Amount</th>}
              <th className="w-8 px-2 py-2" aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={index}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-2 py-1.5 text-slate-300">
                  <GripVertical className="size-3" />
                </td>
                {show.description && (
                  <td className="px-2 py-1.5">
                    <input
                      aria-label="Cargo description"
                      value={item.description}
                      onChange={(event) =>
                        updateItem(index, "description", event.target.value)
                      }
                      className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                    />
                  </td>
                )}
                {show.hsCode && (
                  <td className="px-2 py-1.5">
                    <input
                      aria-label="HS code"
                      value={item.hsCode}
                      onChange={(event) =>
                        updateItem(index, "hsCode", event.target.value)
                      }
                      className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                    />
                  </td>
                )}
                {show.packages && (
                  <td className="px-2 py-1.5">
                    <input
                      aria-label="Packages"
                      type="number"
                      min="0"
                      value={item.packages || ""}
                      onChange={(event) =>
                        updateItem(index, "packages", event.target.value)
                      }
                      className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                    />
                  </td>
                )}
                {show.quantity && (
                  <td className="px-2 py-1.5">
                    <div className="flex min-w-24 items-center gap-1">
                      <input
                        aria-label="Item quantity"
                        type="number"
                        min="0"
                        value={item.quantity || ""}
                        onChange={(event) =>
                          updateItem(index, "quantity", event.target.value)
                        }
                        className="h-7 w-14 rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                      />
                      <input
                        aria-label="Quantity unit"
                        value={item.quantityUnit}
                        onChange={(event) =>
                          updateItem(index, "quantityUnit", event.target.value)
                        }
                        className="h-7 w-12 rounded border border-transparent bg-transparent px-1 text-[10px] focus:border-sky-500 focus:bg-white"
                        placeholder="pcs"
                      />
                    </div>
                  </td>
                )}
                {show.netKg && (
                  <td className="px-2 py-1.5">
                    <input
                      aria-label="Net weight in kilograms"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.netKg || ""}
                      onChange={(event) =>
                        updateItem(index, "netKg", event.target.value)
                      }
                      className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                    />
                  </td>
                )}
                {show.grossKg && (
                  <td className="px-2 py-1.5">
                    <input
                      aria-label="Gross weight in kilograms"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.grossKg || ""}
                      onChange={(event) =>
                        updateItem(index, "grossKg", event.target.value)
                      }
                      className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                    />
                  </td>
                )}
                {show.dimensions && (
                  <td className="px-2 py-1.5">
                    <input
                      aria-label="Cargo dimensions"
                      value={item.dimensions}
                      onChange={(event) =>
                        updateItem(index, "dimensions", event.target.value)
                      }
                      className="h-7 w-full min-w-24 rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                      placeholder="L×W×H cm"
                    />
                  </td>
                )}
                {show.volumeM3 && (
                  <td className="px-2 py-1.5">
                    <input
                      aria-label="Volume in cubic meters"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.volumeM3 || ""}
                      onChange={(event) =>
                        updateItem(index, "volumeM3", event.target.value)
                      }
                      className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                    />
                  </td>
                )}
                {show.unitPrice && (
                  <td className="px-2 py-1.5">
                    <input
                      aria-label="Unit price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice || ""}
                      onChange={(event) =>
                        updateItem(index, "unitPrice", event.target.value)
                      }
                      className="h-7 w-full min-w-20 rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                    />
                  </td>
                )}
                {show.currency && (
                  <td className="px-2 py-1.5">
                    <input
                      aria-label="Currency"
                      value={item.currency}
                      onChange={(event) =>
                        updateItem(index, "currency", event.target.value)
                      }
                      className="h-7 w-14 rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                      placeholder="USD"
                    />
                  </td>
                )}
                {show.amount && (
                  <td className="px-2 py-1.5">
                    <input
                      aria-label="Line amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amount || ""}
                      onChange={(event) =>
                        updateItem(index, "amount", event.target.value)
                      }
                      className="h-7 w-full min-w-20 rounded border border-transparent bg-transparent px-1.5 text-[11px] focus:border-sky-500 focus:bg-white"
                    />
                  </td>
                )}
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        items.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    className="text-red-400 hover:text-red-600"
                    aria-label="Delete cargo item"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumnCount}
                  className="px-3 py-8 text-center text-xs text-slate-400"
                >
                  No cargo items extracted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addItem}
        className="mt-3 flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-700"
      >
        <Plus className="size-3.5" />
        Add cargo line
      </button>
    </>
  );
}
