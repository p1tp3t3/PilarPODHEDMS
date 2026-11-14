<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\MissingValue;

/**
 * Base for the app's resources: each one lists only the fields the
 * frontend uses, through field().
 */
abstract class BaseResource extends JsonResource
{
    /** The model's attributes as it would serialize them (see serialized()). */
    private ?array $serialized = null;

    /** A missing record (e.g. no gate pass yet) gives null, not a resource. */
    public static function make(...$parameters)
    {
        return is_null($parameters[0] ?? null) ? null : parent::make(...$parameters);
    }

    /**
     * A model attribute, formatted exactly as the model serializes it (its
     * date format and casts). Left out when the query didn't select it or
     * the model hides it for this viewer (e.g. a sibling's contact details).
     */
    protected function field(string $key): mixed
    {
        $attributes = $this->serialized();

        return array_key_exists($key, $attributes) ? $attributes[$key] : new MissingValue;
    }

    /**
     * The model's own attributesToArray() without its appended accessors:
     * hidden fields excluded, dates and casts formatted the model's way.
     */
    private function serialized(): array
    {
        if ($this->serialized !== null) {
            return $this->serialized;
        }
        if (! $this->resource instanceof \Illuminate\Database\Eloquent\Model) {
            return $this->serialized = [];
        }

        return $this->serialized = (function () {
            $attributes = $this->addDateAttributesToArray($this->getArrayableAttributes());
            $attributes = $this->addMutatedAttributesToArray($attributes, $mutated = $this->getMutatedAttributes());

            return $this->addCastAttributesToArray($attributes, $mutated);
        })->call($this->resource);
    }
}
